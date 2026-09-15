import React, { useSyncExternalStore } from 'react';
import { Activity, Heart, Server, Settings, SquareTerminal, Terminal } from 'lucide-react';
import type { Tab } from '../../types';
import './AppNav.css';

type AppView = 'home' | 'settings' | 'tab' | 'support';
type NavTarget = Exclude<AppView, 'tab'>;

interface AppNavProps {
    activeView: AppView;
    /** Тип активной вкладки — нужен, чтобы подсветить «Консоль», когда открыт локальный терминал */
    activeTabType?: Tab['type'];
    serverCount: number;
    /** Количество открытых вкладок-сессий (без форм подключения) */
    sessionCount: number;
    hasUpdate: boolean;
    /**
     * Свернуть панель в узкую полосу с иконками. Используется при открытой вкладке сессии
     * (терминалу нужна ширина) и в настройках, у которых есть собственная навигация.
     */
    compact: boolean;
    /**
     * Панель стыкуется с соседней навигацией (в настройках): внешнее скругление переходит к ней,
     * иначе между двумя панелями одного цвета остаётся тёмный вырез.
     */
    joined?: boolean;
    onNavigate: (view: NavTarget) => void;
    onOpenConsole: () => void;
    t: (key: string, params?: Record<string, string>) => string;
}

const PRODUCT_NAME = 'YASSH Client';

/** Ниже этой ширины окна панель всегда свёрнута, чтобы не отнимать место у содержимого */
const NARROW_WINDOW_QUERY = '(max-width: 1100px)';

const subscribeToNarrowWindow = (onChange: () => void) => {
    const mediaQuery = window.matchMedia(NARROW_WINDOW_QUERY);
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
};

const getIsNarrowWindow = () => window.matchMedia(NARROW_WINDOW_QUERY).matches;

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    isCompact: boolean;
    badge?: string;
    /** Точка-индикатор на иконке (например, доступно обновление) */
    hasDot?: boolean;
    className?: string;
    onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, isCompact, badge, hasDot, className, onClick }) => (
    <button
        type="button"
        className={`app-nav-item ${isActive ? 'active' : ''} ${className ?? ''}`}
        onClick={onClick}
        title={isCompact ? label : undefined}
        aria-label={label}
        aria-current={isActive ? 'page' : undefined}
    >
        <span className="app-nav-item-icon">
            {icon}
            {hasDot && <span className="app-nav-item-dot" />}
        </span>
        <span className="app-nav-item-label">{label}</span>
        {badge !== undefined && <span className="app-nav-item-badge">{badge}</span>}
    </button>
);

/**
 * Основная навигация приложения.
 *
 * Панель отвечает только за переход между разделами. Открытые сессии живут во вкладках
 * верхней полосы, поэтому пункты здесь и там не повторяют друг друга.
 */
export const AppNav: React.FC<AppNavProps> = React.memo(({
    activeView,
    activeTabType,
    serverCount,
    sessionCount,
    hasUpdate,
    compact,
    joined = false,
    onNavigate,
    onOpenConsole,
    t
}) => {
    const isNarrowWindow = useSyncExternalStore(subscribeToNarrowWindow, getIsNarrowWindow, () => false);
    const isCompact = compact || isNarrowWindow;

    const statusLabel = hasUpdate
        ? t('nav.updateAvailable')
        : sessionCount > 0
            ? t('nav.sessions', { n: String(sessionCount) })
            : t('nav.ready');

    const statusContent = (
        <>
            <span className="app-nav-status-dot" />
            <span className="app-nav-status-label">{statusLabel}</span>
            <Activity size={15} className="app-nav-status-pulse" />
        </>
    );

    return (
        <nav className={`app-nav ${isCompact ? 'is-compact' : ''} ${joined ? 'is-joined' : ''}`}>
            <div className="app-nav-brand" title={isCompact ? PRODUCT_NAME : undefined}>
                <div className="app-nav-brand-icon">
                    <Terminal size={20} strokeWidth={2.25} />
                </div>
                <div className="app-nav-brand-text">
                    <div className="app-nav-brand-name">{PRODUCT_NAME}</div>
                    <div className="app-nav-brand-subtitle">{t('nav.brandSubtitle')}</div>
                </div>
            </div>

            <div className="app-nav-menu">
                <NavItem
                    icon={<Server size={19} />}
                    label={t('nav.servers')}
                    isActive={activeView === 'home'}
                    isCompact={isCompact}
                    badge={String(serverCount)}
                    onClick={() => onNavigate('home')}
                />
                <NavItem
                    icon={<SquareTerminal size={19} />}
                    label={t('nav.console')}
                    isActive={activeView === 'tab' && activeTabType === 'local-terminal'}
                    isCompact={isCompact}
                    onClick={onOpenConsole}
                />
                <NavItem
                    icon={<Settings size={19} />}
                    label={t('nav.settings')}
                    isActive={activeView === 'settings'}
                    isCompact={isCompact}
                    hasDot={hasUpdate}
                    onClick={() => onNavigate('settings')}
                />
                <NavItem
                    icon={<Heart size={19} fill={activeView === 'support' ? 'currentColor' : 'none'} />}
                    label={t('nav.support')}
                    isActive={activeView === 'support'}
                    isCompact={isCompact}
                    className="is-support"
                    onClick={() => onNavigate('support')}
                />
            </div>

            <div className="app-nav-footer">
                {hasUpdate ? (
                    <button
                        type="button"
                        className="app-nav-status has-update"
                        onClick={() => onNavigate('settings')}
                        title={statusLabel}
                    >
                        {statusContent}
                    </button>
                ) : (
                    <div className="app-nav-status" title={statusLabel}>
                        {statusContent}
                    </div>
                )}
            </div>
        </nav>
    );
});
