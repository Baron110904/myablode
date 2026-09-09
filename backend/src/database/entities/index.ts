export * from './agent.entity';
export * from './article-image.entity';
export * from './article.entity';
export * from './audit-log.entity';
export * from './campagne.entity';
export * from './commune.entity';
export * from './contact.entity';
export * from './marche.entity';
export * from './departement.entity';
export * from './depistage.entity';
export * from './kobo-config.entity';
export * from './newsletter.entity';
export * from './setting.entity';
export * from './user.entity';

import { Agent, AgentAffectation, AgentFelicitation } from './agent.entity';
import { Article } from './article.entity';
import { ArticleImage } from './article-image.entity';
import { AuditLog } from './audit-log.entity';
import { Campagne } from './campagne.entity';
import { Commune } from './commune.entity';
import { Benevole, ContactMessage } from './contact.entity';
import { FormulaireMarche, InscriptionMarche } from './marche.entity';
import { Departement } from './departement.entity';
import { Depistage } from './depistage.entity';
import { KoboConfig, KoboSyncLog } from './kobo-config.entity';
import { NewsletterAbonne, NewsletterEnvoi } from './newsletter.entity';
import { Setting } from './setting.entity';
import { User } from './user.entity';

/** Liste explicite consommée par TypeORM (DataSource et TypeOrmModule). */
export const ENTITIES = [
  Agent,
  AgentAffectation,
  AgentFelicitation,
  Article,
  ArticleImage,
  AuditLog,
  Benevole,
  Campagne,
  Commune,
  ContactMessage,
  Departement,
  Depistage,
  FormulaireMarche,
  InscriptionMarche,
  KoboConfig,
  KoboSyncLog,
  NewsletterAbonne,
  NewsletterEnvoi,
  Setting,
  User,
];
