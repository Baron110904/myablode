/** Champ de formulaire public avec libellé, aide et message d'erreur liés. */
export function ChampFormulaire({
  id,
  libelle,
  type = 'text',
  valeur,
  onChange,
  obligatoire = false,
  erreur,
  aide,
  placeholder,
  autoComplete,
  options,
  lignes,
}: {
  id: string;
  libelle: string;
  type?: string;
  valeur: string;
  onChange: (valeur: string) => void;
  obligatoire?: boolean;
  erreur?: string;
  aide?: string;
  placeholder?: string;
  autoComplete?: string;
  /** Rend un <select> au lieu d'un <input>. */
  options?: Array<{ valeur: string; libelle: string }>;
  /** Rend un <textarea> de N lignes. */
  lignes?: number;
}) {
  const idAide = aide ? `${id}-aide` : undefined;
  const idErreur = erreur ? `${id}-erreur` : undefined;
  const decritPar = [idAide, idErreur].filter(Boolean).join(' ') || undefined;

  const proprietesCommunes = {
    id,
    name: id,
    required: obligatoire,
    'aria-invalid': erreur ? true : undefined,
    'aria-describedby': decritPar,
    className: `${lignes ? 'champ-multiligne' : 'champ'} ${erreur ? 'champ-erreur' : ''}`,
    value: valeur,
    placeholder,
    autoComplete,
  };

  return (
    <div>
      <label htmlFor={id} className="etiquette mb-2 block">
        {libelle}
        {obligatoire && (
          <span aria-hidden className="ml-1 text-ablode-vert">
            *
          </span>
        )}
      </label>

      {options ? (
        <select
          {...proprietesCommunes}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">—</option>
          {options.map((option) => (
            <option key={option.valeur} value={option.valeur}>
              {option.libelle}
            </option>
          ))}
        </select>
      ) : lignes ? (
        <textarea
          {...proprietesCommunes}
          rows={lignes}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          {...proprietesCommunes}
          type={type}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {aide && (
        <p id={idAide} className="mt-1.5 text-[0.8125rem] text-ablode-gris">
          {aide}
        </p>
      )}
      {erreur && (
        <p id={idErreur} role="alert" className="mt-1.5 text-[0.8125rem] text-ablode-alerte">
          {erreur}
        </p>
      )}
    </div>
  );
}
