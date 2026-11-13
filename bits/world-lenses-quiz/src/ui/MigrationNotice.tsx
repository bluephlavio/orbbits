/**
 * Shown once after the bank changed edition: which personal routes (and which battery) lost
 * questions that are no longer active, and which were left empty. Each route can be opened to
 * see the removed questions with their suggested alternatives (in the battery). Teacher view:
 * titles are allowed here.
 */
import { BANK } from './data.ts';
import { Icon } from './icons.tsx';
import type { Library } from './useLibrary.ts';

const ids = (list: string[]) => list.join(', ');

export default function MigrationNotice({ library }: { library: Library }) {
  const migration = library.migration;
  if (!migration) return null;
  const from = migration.fromEdition ? `dalla ${migration.fromEdition}ª ` : '';
  const to = BANK.edition ? `alla ${BANK.edition}ª edizione` : 'a una nuova edizione';

  return (
    <section className="migration" aria-labelledby="wlq-migration-title">
      <header>
        <Icon name="info" />
        <h3 id="wlq-migration-title">
          La banca è passata {from}
          {to}
        </h3>
      </header>
      <p className="migration-lead">
        Le domande non più attive sono state tolte; tutto il resto è rimasto com’era: nomi, ordine
        e domande ancora valide.
      </p>
      <ul>
        {migration.presets.map((change) => {
          const preset = library.personal.find((p) => p.id === change.id);
          return (
            <li key={change.id}>
              <span className="migration-what">
                <b>«{change.title}»</b>: {change.removed.length === 1 ? 'tolta' : 'tolte'}{' '}
                {ids(change.removed)}
                {change.empty ? ' — è rimasto vuoto, da ricomporre' : ''}.
              </span>
              {preset && (
                <button type="button" className="mini" onClick={() => library.loadPreset(preset)}>
                  {change.empty ? 'Ricomponi' : 'Apri'}
                </button>
              )}
            </li>
          );
        })}
        {migration.draftRemoved.length > 0 && (
          <li>
            <span className="migration-what">
              <b>Batteria in preparazione</b>: {migration.draftRemoved.length === 1 ? 'tolta' : 'tolte'}{' '}
              {ids(migration.draftRemoved)}.
            </span>
          </li>
        )}
        {migration.draftRefreshed && (
          <li>
            <span className="migration-what">
              <b>Batteria in preparazione</b>: il percorso «{migration.draftRefreshed}» è stato
              ricaricato nella nuova edizione.
            </span>
          </li>
        )}
      </ul>
      <p className="fine">
        Aprendo un percorso, la batteria elenca le domande tolte e propone eventuali alternative:
        sceglierle è una decisione tua.
      </p>
      <button type="button" className="chip" onClick={library.acknowledgeMigration}>
        <Icon name="check" /> Ho capito
      </button>
    </section>
  );
}
