interface SummaryModuleProps {
  summary: string;
}

const SummaryModule = ({ summary }: SummaryModuleProps) => {
  return (
    <div className="hud-panel h-full overflow-auto">
      <h2 className="text-xs font-bold text-primary mb-2 uppercase tracking-wider flex items-center gap-2">
        <span className="alert-indicator"></span>
        SYNTHÈSE
      </h2>

      {summary ? (
        <div className="p-3 bg-card/30 border border-primary/20 rounded">
          <p className="text-xs text-foreground leading-relaxed">{summary}</p>
        </div>
      ) : (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          Aucune synthèse disponible
        </div>
      )}
    </div>
  );
};

export default SummaryModule;
