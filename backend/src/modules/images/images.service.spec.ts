import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { ImagesService } from './images.service';

/**
 * Le depot d'images du back-office.
 *
 * Ce qui compte ici n'est pas qu'un fichier soit ecrit, mais ce qui l'est :
 * l'illustration d'article est servie hors du redimensionnement de Next, qui
 * ne s'applique qu'aux fichiers locaux. Une photo de telephone deposee telle
 * quelle partirait a cinq megaoctets chez chaque visiteur.
 */
describe('ImagesService', () => {
  let service: ImagesService;
  let dossier: string;

  const fichier = (buffer: Buffer, mimetype = 'image/jpeg') =>
    ({ buffer, mimetype, originalname: 'photo.jpg' }) as Express.Multer.File;

  /** Une image réelle, assez grande pour que le redimensionnement se voie. */
  const photo = (largeur: number, hauteur: number) =>
    sharp({
      create: {
        width: largeur,
        height: hauteur,
        channels: 3,
        background: { r: 20, g: 120, b: 70 },
      },
    })
      .jpeg()
      .toBuffer();

  beforeEach(() => {
    dossier = mkdtempSync(join(tmpdir(), 'ablode-images-'));
    service = new ImagesService({
      get: (cle: string) => (cle === 'uploads.dir' ? dossier : undefined),
    } as unknown as ConfigService);
  });

  it('ramène une photo trop large à 1600 px', async () => {
    const depose = await service.deposer(fichier(await photo(4000, 3000)));
    expect(depose.largeur).toBe(1600);
    expect(depose.hauteur).toBe(1200);
  });

  it('n’agrandit pas une petite image', async () => {
    const depose = await service.deposer(fichier(await photo(400, 300)));
    expect(depose.largeur).toBe(400);
  });

  it('écrit du WebP, quel que soit le format déposé', async () => {
    const depose = await service.deposer(fichier(await photo(1200, 800), 'image/png'));
    expect(depose.url).toMatch(/\.webp$/);

    const nom = depose.url.split('/').pop() as string;
    const ecrit = readFileSync(join(dossier, 'images', nom));
    // Signature RIFF/WEBP, lue dans les octets du fichier.
    expect(ecrit.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(ecrit.subarray(8, 12).toString('ascii')).toBe('WEBP');
  });

  it('allège réellement le fichier', async () => {
    const original = await photo(4000, 3000);
    const depose = await service.deposer(fichier(original));
    expect(depose.taille).toBeLessThan(original.length);
  });

  /*
   * Le nom est tire au sort et l'extension vient du format de sortie : aucun
   * fragment de chaine controlee par le client n'atteint le systeme de
   * fichiers. C'est ce qui ferme la traversee de repertoire et la double
   * extension (« photo.jpg.php »).
   */
  it('ne reprend rien du nom envoyé par le navigateur', async () => {
    const piege = {
      buffer: await photo(100, 100),
      mimetype: 'image/jpeg',
      originalname: '../../../etc/passwd.php.jpg',
    } as Express.Multer.File;

    const depose = await service.deposer(piege);
    expect(depose.url).not.toContain('..');
    expect(depose.url).not.toContain('passwd');
    expect(readdirSync(join(dossier, 'images'))).toHaveLength(1);
  });

  it('refuse un format que les navigateurs ne liraient pas', async () => {
    await expect(
      service.deposer(fichier(Buffer.from('%PDF-1.4'), 'application/pdf')),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse un fichier qui se dit image sans l’être', async () => {
    await expect(
      service.deposer(fichier(Buffer.from('ceci n’est pas une image'))),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuse une requête sans fichier', async () => {
    await expect(
      service.deposer(undefined as unknown as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

/*
 * Une photo prise telephone a la verticale est stockee en paysage, avec une
 * balise EXIF qui dit au lecteur de pivoter. Redimensionnee sans tenir compte
 * de cette balise, elle ressort couchee et aux mauvaises dimensions.
 */
describe('ImagesService - orientation des photos', () => {
  let service: ImagesService;

  beforeEach(() => {
    const dossier = mkdtempSync(join(tmpdir(), 'ablode-exif-'));
    service = new ImagesService({
      get: (cle: string) => (cle === 'uploads.dir' ? dossier : undefined),
    } as unknown as ConfigService);
  });

  it('respecte l’orientation EXIF avant de redimensionner', async () => {
    const portrait = await sharp({
      create: { width: 4000, height: 3000, channels: 3, background: { r: 10, g: 120, b: 70 } },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();

    const depose = await service.deposer({
      buffer: portrait,
      mimetype: 'image/jpeg',
      originalname: 'portrait.jpg',
    } as Express.Multer.File);

    // Redressée, l'image est plus haute que large, et bornée à 1600 de large.
    expect(depose.largeur).toBe(1600);
    expect(depose.hauteur).toBeGreaterThan(depose.largeur);
  });
});
