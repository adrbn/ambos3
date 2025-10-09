import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/useTranslation";
import { Language } from "@/i18n/translations";

interface ReportGeneratorProps {
  articles: any[];
  analysis: any;
  query: string;
  language: Language;
}

const ReportGenerator = ({ articles, analysis, query, language }: ReportGeneratorProps) => {
  const { t } = useTranslation(language);

  const generateHTMLReport = () => {
    if (articles.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const timestamp = new Date().toLocaleString(language);
    const reportTitle = `Rapport AMBOS - ${query}`;
    
    // Build HTML report
    const html = `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    .header .meta {
      font-size: 0.9em;
      opacity: 0.9;
    }
    .section {
      padding: 30px 40px;
      border-bottom: 1px solid #e0e0e0;
    }
    .section:last-child {
      border-bottom: none;
    }
    .section-title {
      font-size: 1.8em;
      color: #667eea;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #667eea;
    }
    .summary-box {
      background: #f8f9ff;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 15px 0;
      border-radius: 4px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .stat-card .number {
      font-size: 2.5em;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .stat-card .label {
      font-size: 0.9em;
      opacity: 0.9;
    }
    .article-grid {
      display: grid;
      gap: 20px;
      margin-top: 20px;
    }
    .article-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      transition: transform 0.2s, box-shadow 0.2s;
      background: white;
    }
    .article-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .article-title {
      font-size: 1.2em;
      font-weight: bold;
      color: #1a1a1a;
      margin-bottom: 10px;
    }
    .article-meta {
      font-size: 0.85em;
      color: #666;
      margin-bottom: 10px;
    }
    .article-description {
      color: #444;
      margin: 10px 0;
    }
    .article-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }
    .article-link:hover {
      text-decoration: underline;
    }
    .osint-badge {
      display: inline-block;
      background: #764ba2;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.75em;
      margin-right: 8px;
    }
    .credibility-score {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 0.9em;
    }
    .score-high { background: #4ade80; color: white; }
    .score-medium { background: #fbbf24; color: white; }
    .score-low { background: #f87171; color: white; }
    .predictions-list {
      list-style: none;
      margin: 20px 0;
    }
    .predictions-list li {
      background: #f8f9ff;
      padding: 15px;
      margin: 10px 0;
      border-left: 4px solid #667eea;
      border-radius: 4px;
    }
    .footer {
      background: #f5f5f5;
      padding: 20px;
      text-align: center;
      font-size: 0.9em;
      color: #666;
    }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; }
      .article-card { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ ${reportTitle}</h1>
      <div class="meta">
        <p><strong>Requête:</strong> ${query}</p>
        <p><strong>Généré le:</strong> ${timestamp}</p>
        <p><strong>Langue:</strong> ${language.toUpperCase()}</p>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">📊 Statistiques</h2>
      <div class="stats">
        <div class="stat-card">
          <div class="number">${articles.length}</div>
          <div class="label">Articles analysés</div>
        </div>
        ${analysis?.sentiment ? `
        <div class="stat-card">
          <div class="number">${analysis.sentiment.score || 'N/A'}</div>
          <div class="label">Score de sentiment</div>
        </div>
        ` : ''}
        ${analysis?.entities?.length ? `
        <div class="stat-card">
          <div class="number">${analysis.entities.length}</div>
          <div class="label">Entités identifiées</div>
        </div>
        ` : ''}
      </div>
    </div>

    ${analysis?.summary ? `
    <div class="section">
      <h2 class="section-title">📝 Résumé de l'analyse IA</h2>
      <div class="summary-box">
        ${analysis.summary.split('\n').map((p: string) => `<p style="margin-bottom: 10px;">${p}</p>`).join('')}
      </div>
    </div>
    ` : ''}

    ${analysis?.predictions?.length ? `
    <div class="section">
      <h2 class="section-title">🔮 Prédictions & Tendances</h2>
      <ul class="predictions-list">
        ${analysis.predictions.map((pred: any) => `
          <li><strong>${pred.trend || pred.title || pred}</strong></li>
        `).join('')}
      </ul>
    </div>
    ` : ''}

    <div class="section">
      <h2 class="section-title">📰 Articles (${articles.length})</h2>
      <div class="article-grid">
        ${articles.map((article: any) => `
          <div class="article-card">
            ${article.osint ? `
              <span class="osint-badge">${article.osint.platform.toUpperCase()}</span>
              <span class="credibility-score ${
                article.osint.credibilityScore >= 70 ? 'score-high' : 
                article.osint.credibilityScore >= 50 ? 'score-medium' : 'score-low'
              }">
                Crédibilité: ${article.osint.credibilityScore}/100
              </span>
            ` : ''}
            <h3 class="article-title">${article.title || 'Sans titre'}</h3>
            <div class="article-meta">
              <strong>Source:</strong> ${article.source?.name || 'Inconnue'} | 
              <strong>Date:</strong> ${new Date(article.publishedAt).toLocaleDateString(language)}
              ${article.author ? ` | <strong>Auteur:</strong> ${article.author}` : ''}
            </div>
            ${article.description ? `
              <p class="article-description">${article.description}</p>
            ` : ''}
            ${article.osint?.engagement ? `
              <div style="margin-top: 10px; font-size: 0.85em; color: #666;">
                👍 ${article.osint.engagement.likes || 0} | 
                🔄 ${article.osint.engagement.reposts || 0} | 
                💬 ${article.osint.engagement.replies || 0}
              </div>
            ` : ''}
            <a href="${article.url}" target="_blank" class="article-link">Lire l'article →</a>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="footer">
      <p><strong>AMBOS</strong> - Advanced Multi-source Biosecurity OSINT System</p>
      <p>Rapport généré automatiquement par analyse IA</p>
    </div>
  </div>
</body>
</html>
    `;

    // Create and download HTML file
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AMBOS_Report_${query.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Rapport HTML téléchargé !");
  };

  const generateJSONReport = () => {
    if (articles.length === 0) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const reportData = {
      metadata: {
        query,
        language,
        timestamp: new Date().toISOString(),
        totalArticles: articles.length,
      },
      analysis: analysis || {},
      articles: articles.map(article => ({
        title: article.title,
        description: article.description,
        url: article.url,
        publishedAt: article.publishedAt,
        source: article.source,
        author: article.author,
        osint: article.osint || null,
      })),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AMBOS_Data_${query.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Données JSON téléchargées !");
  };

  if (articles.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        onClick={generateHTMLReport}
        variant="outline"
        size="sm"
        className="text-xs hud-button"
      >
        <FileText className="w-3 h-3 mr-1" />
        Rapport HTML
      </Button>
      <Button
        onClick={generateJSONReport}
        variant="outline"
        size="sm"
        className="text-xs hud-button"
      >
        <Download className="w-3 h-3 mr-1" />
        Export JSON
      </Button>
    </div>
  );
};

export default ReportGenerator;
