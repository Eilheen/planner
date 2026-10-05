import { useEffect, useState } from 'react';
import { Cloud, CloudOff, KeyRound, LogOut, Mail, MailCheck, RefreshCw, X } from 'lucide-react';
import { authErrorText, type SyncApi, type SyncStatus } from '@/sync/useSync';
import { btn, btnGhost, btnPrimary, input, iconBtn } from '@/ui';

const STATUS_TEXT: Record<SyncStatus, string> = {
  off: 'Синхронизация не настроена',
  idle: 'Не синхронизировано',
  syncing: 'Синхронизация…',
  synced: 'Всё сохранено в облаке',
  offline: 'Нет интернета, сохраним позже',
  error: 'Не получилось синхронизировать',
};

/** Иконка облака в шапке: показывает состояние синхронизации */
export function SyncButton({ sync, onClick }: { sync: SyncApi; onClick: () => void }) {
  if (!sync.enabled) return null;
  const { user, status } = sync;
  const Icon = !user || status === 'offline' || status === 'error' ? CloudOff : status === 'syncing' ? RefreshCw : Cloud;
  const tone = !user
    ? 'text-slate-400'
    : status === 'error' || status === 'offline'
      ? '!text-amber-500'
      : '!text-blue-500 dark:!text-blue-400';
  return (
    <button type="button" onClick={onClick} className={`${iconBtn} ${tone}`} aria-label={user ? STATUS_TEXT[status] : 'Синхронизация между устройствами'} title={user ? STATUS_TEXT[status] : 'Войти, чтобы задачи были на всех устройствах'}>
      <Icon className={`h-4 w-4 ${status === 'syncing' ? 'animate-spin motion-reduce:animate-none' : ''}`} />
    </button>
  );
}

type Mode = 'link' | 'password';
type Sent = null | 'link' | 'confirm';

const label = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400';

/** Вход (ссылкой из письма или паролем) и управление синхронизацией */
export function SyncDialog({ sync, onClose, onSignedIn }: { sync: SyncApi; onClose: () => void; onSignedIn: () => void }) {
  const [mode, setMode] = useState<Mode>('link');
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('planner:lastEmail') ?? '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [sent, setSent] = useState<Sent>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  /** Проверить почту, запомнить её и выполнить действие с понятной ошибкой */
  const run = async (fn: (email: string) => Promise<void>) => {
    const e = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(e)) {
      setError('Проверь адрес почты.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      try {
        localStorage.setItem('planner:lastEmail', e);
      } catch {
        /* не страшно */
      }
      await fn(e);
    } catch (err) {
      setError(authErrorText(err));
    } finally {
      setBusy(false);
    }
  };

  const sendLink = () =>
    run(async (e) => {
      await sync.sendCode(e);
      setSent('link');
    });

  const signIn = () =>
    run(async (e) => {
      await sync.signInPassword(e, password);
      onSignedIn();
    });

  const signUp = () =>
    run(async (e) => {
      if (password.length < 6) throw new Error('password');
      const needsConfirm = await sync.signUpPassword(e, password);
      if (needsConfirm) setSent('confirm');
      else onSignedIn();
    });

  const last = sync.lastSync ? new Date(sync.lastSync).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-slate-900/40 backdrop-blur-sm md:items-center md:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Синхронизация" className="max-h-[92dvh] w-full animate-sheet-up overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl dark:border-slate-800 dark:bg-slate-900 md:max-w-md md:animate-scale-in md:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-white">
            <Cloud className="h-5 w-5 text-blue-500" />
            Синхронизация
          </h2>
          <button type="button" onClick={onClose} className={btnGhost} aria-label="Закрыть">
            <X className="h-5 w-5" />
          </button>
        </div>

        {sync.user ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Аккаунт</p>
              <p className="mt-0.5 break-all font-semibold text-slate-800 dark:text-white">{sync.user.email}</p>
              <p className={`mt-2 text-sm ${sync.status === 'error' || sync.status === 'offline' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {STATUS_TEXT[sync.status]}
                {sync.status === 'synced' && last ? ` · ${last}` : ''}
              </p>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Войди с этой же почтой на телефоне и других устройствах, и задачи будут одинаковые везде. Изменения приходят сами за пару секунд.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnPrimary} onClick={() => void sync.sync()} disabled={sync.status === 'syncing'}>
                <RefreshCw className={`h-4 w-4 ${sync.status === 'syncing' ? 'animate-spin' : ''}`} />
                Синхронизировать
              </button>
              <button type="button" className={btn} onClick={() => void sync.signOut()}>
                <LogOut className="h-4 w-4" />
                Выйти
              </button>
            </div>
            <p className="text-xs text-slate-400">После выхода задачи останутся на этом устройстве, но перестанут обновляться.</p>
          </div>
        ) : sent ? (
          <div className="space-y-4 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 dark:bg-blue-900/30">
              <MailCheck className="h-6 w-6" />
            </span>
            <p className="font-semibold text-slate-800 dark:text-white">Письмо отправлено на {email.trim()}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {sent === 'link'
                ? 'Открой его на этом же устройстве и нажми «Sign in». Сайт откроется уже с включённой синхронизацией.'
                : 'Открой его и нажми ссылку, чтобы подтвердить почту. После этого входи с паролем на любом устройстве.'}{' '}
              Письмо приходит от Supabase, если его нет — проверь «Спам».
            </p>
            <div className="flex justify-center gap-2">
              <button type="button" className={btn} onClick={() => setSent(null)}>
                Назад
              </button>
              {sent === 'confirm' && (
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={() => {
                    setSent(null);
                    setMode('password');
                  }}
                >
                  Уже подтвердил, войти
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Войди, и задачи будут одинаковыми на компьютере и телефоне. Задачи с этого устройства не пропадут, а объединятся с облаком.</p>

            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="group" aria-label="Способ входа">
              {(
                [
                  ['link', 'Ссылка на почту', Mail],
                  ['password', 'Почта и пароль', KeyRound],
                ] as const
              ).map(([m, text, Icon]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setError('');
                  }}
                  aria-pressed={mode === m}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition-all ${
                    mode === m ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {text}
                </button>
              ))}
            </div>

            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void (mode === 'link' ? sendLink() : signIn());
              }}
            >
              <label className="block">
                <span className={label}>Почта</span>
                <input id="sync-email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={input} />
              </label>
              {mode === 'password' && (
                <label className="block">
                  <span className={label}>Пароль</span>
                  <input id="sync-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Не меньше 6 символов" className={input} />
                </label>
              )}
              {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

              {mode === 'link' ? (
                <>
                  <button type="submit" className={`${btnPrimary} w-full !py-2.5`} disabled={busy}>
                    <Mail className="h-4 w-4" />
                    {busy ? 'Отправляем…' : 'Прислать ссылку для входа'}
                  </button>
                  <p className="text-xs text-slate-400">
                    Пароль не нужен. Если сайт добавлен на главный экран телефона как приложение, лучше входить паролем: ссылка из письма откроется в обычном браузере.
                  </p>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="submit" className={`${btnPrimary} !py-2.5`} disabled={busy || !password}>
                      Войти
                    </button>
                    <button type="button" className={`${btn} !py-2.5`} disabled={busy || !password} onClick={() => void signUp()}>
                      Создать аккаунт
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">Первый раз? Придумай пароль и нажми «Создать аккаунт».</p>
                </>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
