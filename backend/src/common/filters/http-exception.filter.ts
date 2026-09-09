import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface ReponseErreur {
  statusCode: number;
  message: string;
  erreurs?: string[];
  chemin: string;
  horodatage: string;
}

/**
 * Uniformise les réponses d'erreur et empêche les fuites d'information.
 *
 * Une erreur SQL brute révèle la structure de la base : elle est journalisée
 * côté serveur mais remplacée par un message générique côté client.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const contexte = host.switchToHttp();
    const response = contexte.getResponse<Response>();
    const request = contexte.getRequest<Request>();

    const { statusCode, message, erreurs } = this.analyser(exception);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} → ${statusCode} : ${
          exception instanceof Error ? exception.stack : String(exception)
        }`,
      );
    }

    const corps: ReponseErreur = {
      statusCode,
      message,
      chemin: request.url,
      horodatage: new Date().toISOString(),
    };
    if (erreurs?.length) corps.erreurs = erreurs;

    response.status(statusCode).json(corps);
  }

  private analyser(exception: unknown): {
    statusCode: number;
    message: string;
    erreurs?: string[];
  } {
    if (exception instanceof HttpException) {
      const reponse = exception.getResponse();
      if (typeof reponse === 'string') {
        return { statusCode: exception.getStatus(), message: reponse };
      }

      const objet = reponse as { message?: string | string[]; error?: string };
      // class-validator renvoie un tableau de messages : le premier sert de
      // résumé, l'ensemble est fourni pour l'affichage champ par champ.
      if (Array.isArray(objet.message)) {
        return {
          statusCode: exception.getStatus(),
          message: objet.message[0] ?? 'Requête invalide.',
          erreurs: objet.message,
        };
      }
      return {
        statusCode: exception.getStatus(),
        message: objet.message ?? objet.error ?? 'Une erreur est survenue.',
      };
    }

    if (exception instanceof QueryFailedError) {
      const code = (exception as unknown as { code?: string }).code;
      if (code === '23505') {
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'Cet enregistrement existe déjà.',
        };
      }
      if (code === '23503') {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Référence invalide : l’élément lié n’existe pas.',
        };
      }
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Erreur lors de l’accès aux données.',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Une erreur interne est survenue.',
    };
  }
}
