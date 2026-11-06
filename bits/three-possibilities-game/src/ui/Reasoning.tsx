/**
 * The reasoning: separate from the statistics and opened only on request. Three cases, one for
 * each place the meteorite can be, built up one row at a time so that a class can answer before
 * the next row appears. The cases are computed from the rules, not typed in.
 */
import { useState } from 'react';
import { OPTIONS, finalOption, hostOpens, LABELS, openable } from '../game/rules.ts';
import type { Option } from '../game/rules.ts';
import Panel from './Panel.tsx';

/** The first choice of the reasoning. Any option would do, and the text says so. */
const PICK: Option = 0;

const CASES = OPTIONS.map((prize) => {
  const opened = hostOpens(prize, PICK, 0);
  return {
    prize,
    opened,
    options: openable(prize, PICK),
    right: prize === PICK,
    stayWins: finalOption('stay', PICK, opened) === prize,
    switchWins: finalOption('switch', PICK, opened) === prize,
  };
});

const STAY_WINS = CASES.filter((c) => c.stayWins).length;
const SWITCH_WINS = CASES.filter((c) => c.switchWins).length;

const STEPS = [
  {
    title: 'Tre casi, ugualmente probabili',
    text: 'Scegli la I (con la II o la III il ragionamento è identico). Il meteorite può essere in tre posti, e nessuno è più probabile degli altri.',
  },
  {
    title: 'La prima scelta',
    text: 'In un caso su tre hai indovinato. Negli altri due, no. Finora nessuna sorpresa.',
  },
  {
    title: 'Il gioco rivela una pietra',
    text: 'Il gioco conosce la posizione del meteorite. Nei casi 2 e 3 non ha scelta: una possibilità è la tua, l’altra ha il meteorite, resta una sola pietra da rivelare. Nel caso 1 ha due pietre e ne rivela una a caso: quale, non cambia nulla.',
  },
  {
    title: 'Se confermi',
    text: 'Tieni la I: vinci solo se avevi già indovinato.',
  },
  {
    title: 'Se cambi',
    text: 'Prendi l’altra possibilità rimasta chiusa: perdi solo se avevi già indovinato. Negli altri due casi quella che resta è proprio quella del meteorite.',
  },
] as const;

function Mini({ content, mine, open }: { content: 'meteorite' | 'stone'; mine: boolean; open: boolean }) {
  return (
    <span className="mini" data-mine={mine || undefined} data-open={open || undefined} data-content={content}>
      <svg viewBox="0 0 40 34" aria-hidden="true">
        <path className="mini-box" d="M5 12v15c0 2.2 6.7 4 15 4s15-1.8 15-4V12c0 2.2-6.7 4-15 4s-15-1.8-15-4Z" />
        <ellipse className="mini-lid" cx="20" cy={open ? 6 : 12} rx="15" ry={open ? 5 : 4} />
        {content === 'meteorite' ? (
          <path className="mini-meteorite" d="M14 21c1-4 5-6 9-5s6 3 5 7-5 5-9 4-6-3-5-6Z" />
        ) : (
          <ellipse className="mini-stone" cx="20" cy="22" rx="7" ry="5" />
        )}
      </svg>
    </span>
  );
}

function Outcome({ win }: { win: boolean }) {
  return <span className="verdict-mark" data-win={win || undefined}>{win ? 'vince' : 'perde'}</span>;
}

function Tally({ label, wins }: { label: string; wins: number }) {
  return (
    <p className="tally">
      <span>{label}</span>
      <b>{wins} {wins === 1 ? 'caso' : 'casi'} su {CASES.length}</b>
    </p>
  );
}

interface Props {
  focused: boolean;
  onFocusToggle: () => void;
  onClose: () => void;
}

export default function Reasoning({ focused, onFocusToggle, onClose }: Props) {
  const [step, setStep] = useState(0);
  const last = STEPS.length; // one further step: the conclusion
  const finished = step === last;

  return (
    <Panel
      label="Il ragionamento"
      focused={focused}
      onFocusToggle={onFocusToggle}
      onClose={onClose}
      head={<h3 className="panel-title">Il ragionamento</h3>}
    >
      <blockquote className="claim">
        «Restano due possibilità, quindi 50% ciascuna.»
        <small>Sembra ovvio. Contiamo i casi. Attenzione: qui si svela il risultato; se vuoi prima farti un’idea, torna a giocare.</small>
      </blockquote>

      <figure className="cases" aria-label="I tre casi possibili">
        <div className="cases-head">
          {CASES.map((_, i) => (
            <span key={i}>Caso {i + 1}</span>
          ))}
        </div>

        <div className="cases-row">
          {CASES.map((c, i) => (
            <span className="minis" key={i} role="img" aria-label={`Meteorite nella ${LABELS[c.prize]}`}>
              {OPTIONS.map((option) => (
                <Mini
                  key={option}
                  content={option === c.prize ? 'meteorite' : 'stone'}
                  mine={option === PICK}
                  open={step >= 2 && option === c.opened}
                />
              ))}
            </span>
          ))}
        </div>

        {step >= 1 && (
          <div className="cases-row" data-row="first">
            <h4>La prima scelta</h4>
            {CASES.map((c, i) => (
              <span className="cell" key={i}>{c.right ? 'giusta' : 'sbagliata'}</span>
            ))}
          </div>
        )}
        {step >= 2 && (
          <div className="cases-row" data-row="host">
            <h4>Il gioco rivela</h4>
            {CASES.map((c, i) => (
              <span className="cell" key={i}>
                {c.options.length === 2 ? `${LABELS[c.options[0]]} o ${LABELS[c.options[1]]}` : `solo la ${LABELS[c.opened]}`}
              </span>
            ))}
          </div>
        )}
        {step >= 3 && (
          <div className="cases-row" data-row="stay">
            <h4>Se confermi</h4>
            {CASES.map((c, i) => (
              <span className="cell" key={i}><Outcome win={c.stayWins} /></span>
            ))}
          </div>
        )}
        {step >= 4 && (
          <div className="cases-row" data-row="switch">
            <h4>Se cambi</h4>
            {CASES.map((c, i) => (
              <span className="cell" key={i}><Outcome win={c.switchWins} /></span>
            ))}
          </div>
        )}
      </figure>

      {finished ? (
        <div className="tallies">
          <Tally label="Confermare vince in" wins={STAY_WINS} />
          <Tally label="Cambiare vince in" wins={SWITCH_WINS} />
        </div>
      ) : (
        <div className="step-text" aria-live="polite">
          <h4>{STEPS[step].title}</h4>
          <p>{STEPS[step].text}</p>
        </div>
      )}

      <div className="step-controls">
        <button type="button" className="ghost" aria-disabled={step === 0} onClick={() => setStep(Math.max(0, step - 1))}>
          Indietro
        </button>
        <span className="step-count" aria-live="off">
          {step + 1} di {last + 1}
        </span>
        <button type="button" className="primary" aria-disabled={finished} onClick={() => setStep(Math.min(last, step + 1))}>
          Avanti
        </button>
      </div>

      {finished && (
        <div className="reasoning-text">
          <p>
            <b>Cambiare perde soltanto se la prima scelta era giusta, e la prima scelta è giusta una volta su tre.</b>{' '}
            Tutto qui: cambiare trasforma una prima scelta sbagliata in una vittoria, e sbagliare è due volte più facile che indovinare.
          </p>
          <h4>Perché non 50%?</h4>
          <p>
            Le possibilità rimaste sono due, ma non sono uguali. La tua è stata scelta quando non sapevi nulla. L’altra è quella
            che il gioco, che conosce la posizione del meteorite, ha lasciato chiusa. Vedere una pietra non dice nulla sulla tua
            scelta, perché una pietra da mostrare fra le altre due c’è sempre.
          </p>
          <h4>Se fossero cento possibilità</h4>
          <p>
            Ne scegli una, e il gioco ne rivela 98, tutte con una pietra. Ne resta una sola, oltre alla tua. Pensi ancora che
            siano alla pari?
          </p>
          <h4>Il gioco deve sapere</h4>
          <p>
            Se aprisse una possibilità a caso, senza sapere nulla, e per fortuna trovasse una pietra, allora sì: sarebbe 50%
            ciascuna. A fare la differenza è l’informazione contenuta nella sua scelta.
          </p>
        </div>
      )}
    </Panel>
  );
}
