import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Ellipsis, Globe, LayoutGrid, LayoutList, Plus, Rows3, Search, Server, Terminal } from 'lucide-react';
import type { SSHConfig, AppConfig, Tab } from '../../types';
import { getOSIcon } from '../../utils';
import { isCtrlOrCmd } from '../../utils/shortcuts';
import { useI18n } from '../../utils/i18n';
import './HomeView.css';

const { ipcRenderer } = window;

type CardSize = AppConfig['serverCardSize'];

interface ServerCardLabels {
    sessionOpen: string;
    connect: string;
    moreActions: string;
}

interface ServerCardProps {
    fav: SSHConfig;
    size: CardSize;
    /** По серверу открыта хотя бы одна вкладка: терминал, SFTP, проброс портов или MCP */
    hasOpenSession: boolean;
    labels: ServerCardLabels;
    onConnect: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
}

const ServerCard = React.memo<ServerCardProps>(({ fav, size, hasOpenSession, labels, onConnect, onContextMenu }) => {
    const title = fav.name || fav.host;

    const icon = (
        <div className={`server-card-icon ${fav.osPrettyName ? '' : 'is-fallback'}`}>
            {fav.osPrettyName ? (
                <img
                    src={getOSIcon(fav.osPrettyName)}
                    alt={fav.osPrettyName}
                    draggable="false"
                    loading="lazy"
                    decoding="async"
                />
            ) : (
                <Server size={size === 'compact' ? 15 : 22} />
            )}
        </div>
    );

    const controls = (
        <div className="server-card-controls">
            {hasOpenSession && (
                <span className="server-card-status" title={labels.sessionOpen} aria-label={labels.sessionOpen} />
            )}
            <button
                type="button"
                className="server-card-menu-btn"
                onClick={(e) => {
                    e.stopPropagation();
                    onContextMenu(e);
                }}
                title={labels.moreActions}
                aria-label={labels.moreActions}
            >
                <Ellipsis size={18} />
            </button>
        </div>
    );

    const tags = (
        <div className="server-card-tags">
            <span className="server-card-tag">SSH</span>
            <span className="server-card-tag">{fav.user.toUpperCase()}</span>
        </div>
    );

    const host = (
        <div className="server-card-host">
            <Globe size={size === 'compact' ? 12 : 15} />
            <span>{fav.host}</span>
        </div>
    );

    if (size === 'standard') {
        return (
            <div className="server-card standard" onClick={onConnect} onContextMenu={onContextMenu}>
                <div className="server-card-top">
                    {icon}
                    {controls}
                </div>
                <div className="server-card-body">
                    <div className="server-card-name" title={title}>{title}</div>
                    {tags}
                </div>
                <div className="server-card-footer">
                    {host}
                    <button
                        type="button"
                        className="server-card-go"
                        onClick={(e) => {
                            e.stopPropagation();
                            onConnect();
                        }}
                        title={labels.connect}
                        aria-label={labels.connect}
                    >
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        );
    }

    if (size === 'medium') {
        return (
            <div className="server-card medium" onClick={onConnect} onContextMenu={onContextMenu}>
                {icon}
                <div className="server-card-body">
                    <div className="server-card-name" title={title}>{title}</div>
                    {tags}
                    {host}
                </div>
                {controls}
            </div>
        );
    }

    return (
        <div className="server-card compact" onClick={onConnect} onContextMenu={onContextMenu}>
            {icon}
            <div className="server-card-body">
                <div className="server-card-name" title={title}>{title}</div>
                {host}
            </div>
            {controls}
        </div>
    );
});

/** Декоративная изометрическая «коробка сервера». Цвета берутся из переменных темы. */
const HomeIllustration: React.FC = () => (
    <svg className="home-illustration" viewBox="0 0 250 180" aria-hidden="true" focusable="false">
        <defs>
            <filter id="home-illustration-shadow" x="-30%" y="-150%" width="160%" height="400%">
                <feGaussianBlur stdDeviation="7" />
            </filter>
            <filter id="home-illustration-glow" x="-300%" y="-300%" width="700%" height="700%">
                <feGaussianBlur stdDeviation="2.4" />
            </filter>
        </defs>
        <circle className="illu-halo" cx="200" cy="52" r="46" />
        <ellipse className="illu-shadow" cx="128" cy="162" rx="92" ry="11" filter="url(#home-illustration-shadow)" />

        {/* Нижний блок */}
        <path className="illu-left" d="M34 102 L126 138 L126 160 L34 124 Z" />
        <path className="illu-right" d="M126 138 L218 102 L218 124 L126 160 Z" />
        <path className="illu-top-muted" d="M34 102 L126 66 L218 102 L126 138 Z" />

        {/* Верхний блок */}
        <path className="illu-left" d="M34 70 L126 106 L126 130 L34 94 Z" />
        <path className="illu-right" d="M126 106 L218 70 L218 94 L126 130 Z" />
        <path className="illu-top" d="M34 70 L126 34 L218 70 L126 106 Z" />
        <path className="illu-edge" d="M34 70 L126 106 L218 70" />

        <line className="illu-strip" x1="160" y1="105" x2="202" y2="88" />
        <circle className="illu-led-glow" cx="146" cy="110" r="4" filter="url(#home-illustration-glow)" />
        <circle className="illu-led" cx="146" cy="110" r="2.6" />
    </svg>
);

interface HomeViewProps {
    config: AppConfig;
    setConfig: (config: AppConfig) => void;
    addTab: (type: Tab['type'], title: string, config?: SSHConfig, subType?: string) => void;
    onContextMenu: (e: React.MouseEvent, fav: SSHConfig) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    onOpenSupport?: () => void;
    /** ID серверов, по которым сейчас открыты вкладки */
    connectedServerIds: ReadonlySet<string>;
}

export const HomeView: React.FC<HomeViewProps> = React.memo(({
    config,
    setConfig,
    addTab,
    onContextMenu,
    searchQuery,
    setSearchQuery,
    onOpenSupport,
    connectedServerIds
}) => {
    const { t } = useI18n(config.language);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const isMac = ipcRenderer?.platform === 'darwin';
    const cardSize: CardSize = config.serverCardSize || 'standard';

    const handleSetSize = useCallback((size: CardSize) => {
        if (config.serverCardSize === size) return;
        setConfig({ ...config, serverCardSize: size });
    }, [config, setConfig]);

    const handleAddServer = useCallback(() => addTab('connection', t('tabs.connection')), [addTab, t]);

    const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        setSearchQuery('');
        e.currentTarget.blur();
    }, [setSearchQuery]);

    // Ctrl+K (Cmd+K на macOS) переводит фокус в поиск. Сравнение по e.code не зависит от раскладки.
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isCtrlOrCmd(e, isMac) || e.shiftKey || e.altKey || e.code !== 'KeyK') return;
            e.preventDefault();
            searchInputRef.current?.focus();
            searchInputRef.current?.select();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMac]);

    // Время фиксируется при монтировании: рендер остаётся чистым, а экран перемонтируется
    // при каждом переходе на главную, так что срок лицензии проверяется актуально
    const [mountedAt] = useState(() => Date.now());
    const isLicensed = !!(config.licenseKey && (!config.licenseExpiresAt || config.licenseExpiresAt > mountedAt));

    const filteredFavorites = useMemo(() => {
        if (!searchQuery) return config.favorites;
        const query = searchQuery.toLowerCase();
        return config.favorites.filter(fav =>
            (fav.name && fav.name.toLowerCase().includes(query)) ||
            fav.host.toLowerCase().includes(query) ||
            fav.user.toLowerCase().includes(query)
        );
    }, [config.favorites, searchQuery]);

    const viewModes = useMemo(() => [
        { size: 'standard' as const, label: t('home.viewGrid'), icon: <LayoutGrid size={17} /> },
        { size: 'medium' as const, label: t('home.viewCards'), icon: <LayoutList size={17} /> },
        { size: 'compact' as const, label: t('home.viewList'), icon: <Rows3 size={17} /> },
    ], [t]);

    const cardLabels = useMemo<ServerCardLabels>(() => ({
        sessionOpen: t('home.sessionOpen'),
        connect: t('common.connect'),
        moreActions: t('home.moreActions'),
    }), [t]);

    return (
        <div className="home-view">
            <div className="home-view-inner">
                <div className="home-header">
                    <div className="home-heading">
                        <h1 className="home-title">
                            {filteredFavorites.length === 1 ? t('home.server') : t('home.servers')}
                        </h1>
                        <div className="home-subtitle">{t('home.subtitle')}</div>
                    </div>

                    <div className="home-actions">
                        <div className="home-view-toggle" role="group">
                            {viewModes.map(mode => (
                                <button
                                    key={mode.size}
                                    type="button"
                                    className={`home-view-toggle-btn ${cardSize === mode.size ? 'active' : ''}`}
                                    onClick={() => handleSetSize(mode.size)}
                                    title={mode.label}
                                    aria-label={mode.label}
                                    aria-pressed={cardSize === mode.size}
                                >
                                    {mode.icon}
                                </button>
                            ))}
                        </div>

                        <div className="home-search">
                            <Search size={17} className="home-search-icon" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder={t('home.searchPlaceholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                            />
                            <kbd className="home-search-kbd">{isMac ? '⌘ K' : 'Ctrl K'}</kbd>
                        </div>

                        <button type="button" className="home-add-btn" onClick={handleAddServer}>
                            <Plus size={18} />
                            {t('home.addServer')}
                        </button>
                    </div>
                </div>

                <div className={`home-grid ${cardSize}`}>
                    {filteredFavorites.map((fav, i) => (
                        <ServerCard
                            key={fav.id || i}
                            fav={fav}
                            size={cardSize}
                            hasOpenSession={Boolean(fav.id && connectedServerIds.has(fav.id))}
                            labels={cardLabels}
                            onConnect={() => addTab('ssh', fav.name || fav.host, fav)}
                            onContextMenu={(e) => onContextMenu(e, fav)}
                        />
                    ))}

                    <div className={`server-card add-card ${cardSize}`} onClick={handleAddServer}>
                        <div className="add-card-circle">
                            <Plus size={cardSize === 'compact' ? 15 : 22} />
                        </div>
                        <div className="add-card-text">
                            <div className="add-card-title">{t('home.addServer')}</div>
                            <div className="add-card-hint">{t('home.addServerHint')}</div>
                        </div>
                    </div>
                </div>

                <div className="home-footer">
                    <div className="home-tagline">
                        <Terminal size={26} className="home-tagline-icon" />
                        {isLicensed ? (
                            <span>{t('home.tagline')}</span>
                        ) : (
                            <span>
                                {t('home.unlicensedNotice')}
                                <button type="button" className="home-tagline-link" onClick={onOpenSupport}>
                                    {t('home.unlicensedBuy')}
                                </button>
                            </span>
                        )}
                    </div>
                    <HomeIllustration />
                </div>
            </div>
        </div>
    );
});
