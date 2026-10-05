import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { CalendarDays, Delete, Fingerprint, ScanFace } from 'lucide-react';
import {
  bioAvailable,
  bioName,
  bioRegister,
  bioVerify,
  checkPin,
  createLock,
  greeting,
  MAX_FAILS,
  PIN_LENGTH,
  type LockConfig,
} from '@/lock/lock';
import { plural } from '@/utils/date';

/* ---------- общий фон и анимация успешного входа ---------- */

type Phase = 'input' | 'success' | 'leaving';

function Shell({ phase, children }: { phase: Phase; children: ReactNode }) {
  return (
    <div
      className={`fixed inset-0 z-[100] flex select-none flex-col overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-800 text-white dark:from-slate-950 dark:via-indigo-950 dark:to-slate-900 ${
        phase === 'leaving' ? 'lock-out pointer-events-none' : ''
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Вход в планировщик"
    >
      <div className="lock-blob pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-sky-400/30 blur-3xl motion-reduce:animate-none" />
      <div className="lock-blob pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-fuchsia-500/25 blur-3xl motion-reduce:animate-none" style={{ animationDelay: '-9s' }} />
      <div className="relative mx-auto flex h-full w-full max-w-sm flex-col items-center px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(2.5rem+env(safe-area-inset-top))]">
        {children}
      </div>
    </div>
  );
}

function Logo({ done }: { done: boolean }) {
  return (
    <div className="relative flex h-20 w-20 items-center justify-center">
      {done && <span className="lock-ring absolute inset-0 rounded-[28px] border-2 border-white/60 motion-reduce:hidden" />}
      <div
        className={`flex h-20 w-20 items-center justify-center rounded-[28px] shadow-2xl shadow-indigo-950/40 transition-all duration-500 ${
          done ? 'scale-110 bg-white text-indigo-600' : 'bg-white/15 text-white backdrop-blur-md'
        }`}
      >
        {done ? (
          <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path className="lock-check" d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        ) : (
          <CalendarDays className="h-9 w-9" />
        )}
      </div>
    </div>
  );
}

function SuccessText({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="lock-rise mt-6 text-center">
      <p className="text-2xl font-bold">{title}</p>
      <p className="mt-1 text-white/75">{subtitle}</p>
    </div>
  );
}

/* ---------- кружочки и клавиатура ---------- */

function Dots({ value, shake, error }: { value: string; shake: number; error: boolean }) {
  return (
    <div key={shake} className={`flex gap-5 ${shake ? 'lock-shake' : ''}`} aria-live="polite" aria-label={`Введено цифр: ${value.length} из ${PIN_LENGTH}`}>
      {Array.from({ length: PIN_LENGTH }, (_, i) => {
        const on = i < value.length;
        return (
          <span
            key={`${i}-${on}`}
            className={`h-3.5 w-3.5 rounded-full border-2 transition-colors ${
              error ? 'border-rose-300 bg-rose-300' : on ? 'lock-pop border-white bg-white' : 'border-white/70 bg-transparent'
            }`}
          />
        );
      })}
    </div>
  );
}

function Keypad({ onDigit, onDelete, extra, disabled }: { onDigit: (d: string) => void; onDelete: () => void; extra?: ReactNode; disabled?: boolean }) {
  const key =
    'flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white/10 text-[28px] font-medium backdrop-blur-sm transition-all active:scale-90 active:bg-white/30 can-hover:hover:bg-white/20 disabled:opacity-40';
  return (
    <div className="grid grid-cols-3 gap-x-6 gap-y-4">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
        <button key={d} type="button" className={key} onClick={() => onDigit(d)} disabled={disabled}>
          {d}
        </button>
      ))}
      <div className="flex h-[72px] w-[72px] items-center justify-center">{extra}</div>
      <button type="button" className={key} onClick={() => onDigit('0')} disabled={disabled}>
        0
      </button>
      <button type="button" className="flex h-[72px] w-[72px] items-center justify-center rounded-full text-white/85 transition-all active:scale-90 can-hover:hover:bg-white/10" onClick={onDelete} aria-label="Стереть">
        <Delete className="h-7 w-7" />
      </button>
    </div>
  );
}

/** Набор цифр с клавиатуры компьютера */
function usePhysicalKeys(active: boolean, onDigit: (d: string) => void, onDelete: () => void) {
  useEffect(() => {
    if (!active) return;
    const h = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        onDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        onDelete();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [active, onDigit, onDelete]);
}

const BioIcon = ({ className }: { className?: string }) =>
  /Face ID/.test(bioName()) ? <ScanFace className={className} /> : <Fingerprint className={className} />;

/* ---------- экран блокировки ---------- */

interface LockProps {
  config: LockConfig;
  email?: string;
  todayLeft: number;
  onUpdate: (c: LockConfig) => void;
  onUnlocked: () => void;
  onReset: () => void;
}

export function LockScreen({ config, email, todayLeft, onUpdate, onUnlocked, onReset }: LockProps) {
  const [pin, setPinState] = useState('');
  const pinRef = useRef('');
  const setPin = (v: string) => {
    pinRef.current = v;
    setPinState(v);
  };
  const [phase, setPhase] = useState<Phase>('input');
  const [shake, setShake] = useState(0);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [forgot, setForgot] = useState(false);
  const checking = useRef(false);
  const waitSec = Math.max(0, Math.ceil((config.until - now) / 1000));

  useEffect(() => {
    if (!waitSec) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [waitSec]);

  const succeed = useCallback(() => {
    onUpdate({ ...config, fails: 0, until: 0 });
    setPhase('success');
    window.setTimeout(() => setPhase('leaving'), 1050);
    window.setTimeout(onUnlocked, 1550);
  }, [config, onUpdate, onUnlocked]);

  const tryBio = useCallback(async () => {
    if (!config.bioId || phase !== 'input') return;
    try {
      if (await bioVerify(config.bioId)) succeed();
    } catch {
      /* отменено или недоступно — остаётся ввод кода */
    }
  }, [config.bioId, phase, succeed]);

  // биометрия сразу при открытии (где браузер разрешает без нажатия)
  useEffect(() => {
    void tryBio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDigit = useCallback(
    (d: string) => {
      if (phase !== 'input' || waitSec || checking.current) return;
      setError(false);
      const next = (pinRef.current + d).slice(0, PIN_LENGTH);
      setPin(next);
      {
        if (next.length === PIN_LENGTH) {
          checking.current = true;
          void checkPin(config, next).then((ok) => {
            checking.current = false;
            if (ok) {
              succeed();
              return;
            }
            const fails = config.fails + 1;
            if (fails >= MAX_FAILS) {
              onReset();
              return;
            }
            onUpdate({ ...config, fails, until: fails % 5 === 0 ? Date.now() + 30_000 : 0 });
            setNow(Date.now());
            setError(true);
            setShake((s) => s + 1);
            if ('vibrate' in navigator) navigator.vibrate?.([40, 60, 40]);
            window.setTimeout(() => {
              setPin('');
              setError(false);
            }, 450);
          });
        }
      }
    },
     
    [phase, waitSec, config, succeed, onUpdate, onReset]
  );
   
  const onDelete = useCallback(() => phase === 'input' && !checking.current && setPin(pinRef.current.slice(0, -1)), [phase]);
  usePhysicalKeys(phase === 'input' && !forgot, onDigit, onDelete);

  const left = MAX_FAILS - config.fails;

  return (
    <Shell phase={phase}>
      <div className="flex flex-1 flex-col items-center justify-center">
        <Logo done={phase !== 'input'} />
        {phase === 'input' ? (
          <>
            <p className="mt-6 text-xl font-bold">{greeting()}!</p>
            <p className="mt-1 max-w-full truncate text-sm text-white/70">{email ? email : 'Введи код'}</p>
            <div className="mt-8 flex h-6 items-center">
              <Dots value={pin} shake={shake} error={error} />
            </div>
            <p className="mt-4 h-5 text-center text-sm text-white/80" aria-live="polite">
              {waitSec
                ? `Слишком много попыток. Подожди ${waitSec} с`
                : config.fails > 0
                  ? `Неверный код. Осталось попыток: ${left}`
                  : ''}
            </p>
          </>
        ) : (
          <SuccessText
            title={`${greeting()}!`}
            subtitle={todayLeft ? `На сегодня ${todayLeft} ${plural(todayLeft, 'задача', 'задачи', 'задач')}` : 'На сегодня всё свободно'}
          />
        )}
      </div>

      {phase === 'input' && !forgot && (
        <div className="lock-rise flex flex-col items-center gap-6">
          <Keypad
            onDigit={onDigit}
            onDelete={onDelete}
            disabled={!!waitSec}
            extra={
              config.bioId ? (
                <button type="button" onClick={() => void tryBio()} className="flex h-[72px] w-[72px] items-center justify-center rounded-full transition-all active:scale-90 can-hover:hover:bg-white/10" aria-label={`Войти через ${bioName()}`}>
                  <BioIcon className="h-8 w-8" />
                </button>
              ) : null
            }
          />
          <button type="button" onClick={() => setForgot(true)} className="text-sm font-medium text-white/75 hover:text-white">
            Забыли код?
          </button>
        </div>
      )}

      {phase === 'input' && forgot && (
        <div className="lock-rise w-full rounded-3xl bg-white/10 p-5 text-center backdrop-blur-md">
          <p className="font-semibold">Войти заново?</p>
          <p className="mt-2 text-sm text-white/80">
            Выйдем из аккаунта и очистим задачи на этом устройстве. Они останутся в облаке: войди снова почтой и паролем, и всё вернётся. Потом задашь новый код.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setForgot(false)} className="rounded-xl bg-white/15 py-2.5 text-sm font-semibold hover:bg-white/25">
              Назад
            </button>
            <button type="button" onClick={onReset} className="rounded-xl bg-white py-2.5 text-sm font-bold text-indigo-600 hover:bg-blue-50">
              Войти заново
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}

/* ---------- установка кода ---------- */

interface SetupProps {
  email?: string;
  prev?: LockConfig | null;
  onDone: (c: LockConfig) => void;
  /** skipped = true, если код так и не задан */
  onClose: (skipped: boolean) => void;
}

export function PinSetup({ email, prev, onDone, onClose }: SetupProps) {
  const [step, setStep] = useState<'create' | 'confirm' | 'bio'>('create');
  const [first, setFirst] = useState('');
  const [pin, setPinState] = useState('');
  const pinRef = useRef('');
  const setPin = (v: string) => {
    pinRef.current = v;
    setPinState(v);
  };
  const [shake, setShake] = useState(0);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState<Phase>('input');
  const [canBio, setCanBio] = useState(false);
  const [config, setConfig] = useState<LockConfig | null>(null);
  const [bioBusy, setBioBusy] = useState(false);

  useEffect(() => {
    void bioAvailable().then(setCanBio);
  }, []);

  const finish = useCallback(
    (c: LockConfig) => {
      onDone(c);
      setPhase('success');
      window.setTimeout(() => setPhase('leaving'), 1050);
      window.setTimeout(() => onClose(false), 1550);
    },
    [onDone, onClose]
  );

  const onDigit = useCallback(
    (d: string) => {
      if (step === 'bio' || phase !== 'input') return;
      setError('');
      const next = (pinRef.current + d).slice(0, PIN_LENGTH);
      setPin(next);
      {
        if (next.length === PIN_LENGTH) {
          window.setTimeout(() => {
            if (step === 'create') {
              setFirst(next);
              setPin('');
              setStep('confirm');
            } else if (next !== first) {
              setShake((s) => s + 1);
              setError('Коды не совпали. Попробуй ещё раз');
              setPin('');
              setFirst('');
              setStep('create');
            } else {
              void createLock(next, prev).then((c) => {
                if (canBio && !c.bioId) {
                  setConfig(c);
                  setStep('bio');
                } else finish(c);
              });
            }
          }, 180);
        }
      }
    },
     
    [step, phase, first, prev, canBio, finish]
  );
   
  const onDelete = useCallback(() => setPin(pinRef.current.slice(0, -1)), []);
  usePhysicalKeys(step !== 'bio' && phase === 'input', onDigit, onDelete);

  const enableBio = async () => {
    if (!config) return;
    setBioBusy(true);
    try {
      const bioId = await bioRegister(email ?? '');
      finish({ ...config, bioId });
    } catch {
      setBioBusy(false);
      setError(`Не получилось включить ${bioName()}. Можно попробовать позже в меню.`);
    }
  };

  if (phase !== 'input') {
    return (
      <Shell phase={phase}>
        <div className="flex flex-1 flex-col items-center justify-center">
          <Logo done />
          <SuccessText title="Готово!" subtitle={config?.bioId ? `Теперь входи по коду или через ${bioName()}` : 'Теперь входи по коду'} />
        </div>
      </Shell>
    );
  }

  return (
    <Shell phase={phase}>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <Logo done={false} />
        {step === 'bio' ? (
          <div className="lock-rise mt-6 flex flex-col items-center">
            <p className="text-xl font-bold">Включить {bioName()}?</p>
            <p className="mt-2 max-w-xs text-sm text-white/75">Сможешь входить без кода, одним взглядом или касанием. Код останется запасным вариантом.</p>
            <span className="mt-8 flex h-24 w-24 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
              <BioIcon className="h-12 w-12" />
            </span>
            {error && <p className="mt-4 text-sm text-rose-200">{error}</p>}
          </div>
        ) : (
          <>
            <p className="mt-6 text-xl font-bold">{step === 'create' ? (prev ? 'Новый код' : 'Придумай код') : 'Повтори код'}</p>
            <p className="mt-1 max-w-xs text-sm text-white/70">
              {step === 'create' ? 'Четыре цифры для быстрого входа на этом устройстве' : 'Чтобы точно не ошибиться'}
            </p>
            <div className="mt-8 flex h-6 items-center">
              <Dots value={pin} shake={shake} error={false} />
            </div>
            <p className="mt-4 h-5 text-sm text-rose-200" aria-live="polite">
              {error}
            </p>
          </>
        )}
      </div>

      {step === 'bio' ? (
        <div className="lock-rise flex w-full flex-col gap-2">
          <button type="button" onClick={() => void enableBio()} disabled={bioBusy} className="rounded-2xl bg-white py-3.5 font-bold text-indigo-600 shadow-xl transition-all active:scale-95 disabled:opacity-60">
            {bioBusy ? 'Подтверди на устройстве…' : `Включить ${bioName()}`}
          </button>
          <button type="button" onClick={() => config && finish(config)} className="py-3 text-sm font-semibold text-white/80 hover:text-white">
            Не сейчас
          </button>
        </div>
      ) : (
        <div className="lock-rise flex flex-col items-center gap-6">
          <Keypad onDigit={onDigit} onDelete={onDelete} />
          <button type="button" onClick={() => onClose(true)} className="text-sm font-medium text-white/75 hover:text-white">
            {prev ? 'Отмена' : 'Пропустить'}
          </button>
        </div>
      )}
    </Shell>
  );
}
