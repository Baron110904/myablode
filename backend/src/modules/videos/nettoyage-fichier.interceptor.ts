import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { unlink } from 'node:fs/promises';
import { Observable, catchError, throwError } from 'rxjs';

/**
 * Efface le fichier déposé quand la requête échoue après l'écriture.
 *
 * Multer écrit sur le disque avant que la validation du corps s'exécute : un
 * formulaire refusé pour un titre vide laisserait donc une vidéo de cent
 * mégaoctets orpheline, invisible depuis le back-office et impossible à
 * retrouver autrement qu'en ligne de commande. Quelques essais ratés
 * suffiraient à remplir le disque.
 *
 * Les intercepteurs enveloppent l'exécution des pipes : l'erreur de
 * validation passe donc bien par ce `catchError`.
 */
@Injectable()
export class NettoyageFichierInterceptor implements NestInterceptor {
  private readonly logger = new Logger(NettoyageFichierInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const requete = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      catchError((erreur) => {
        const fichier = requete.file;
        if (fichier?.path) {
          unlink(fichier.path).catch((echec: NodeJS.ErrnoException) => {
            if (echec.code !== 'ENOENT') {
              this.logger.warn(`Fichier ${fichier.path} non nettoyé : ${echec.code}`);
            }
          });
        }
        return throwError(() => erreur);
      }),
    );
  }
}
