import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Lightbulb, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AiInsightsSectionProps {
  analysis: string | null;
  recommendations: string[] | null;
  isLoadingAnalysis: boolean;
  isLoadingRecommendations: boolean;
}

export function AiInsightsSection({
  analysis,
  recommendations,
  isLoadingAnalysis,
  isLoadingRecommendations,
}: AiInsightsSectionProps) {
  return (
    <section aria-labelledby="ai-insights-title" className="grid md:grid-cols-2 gap-4 md:gap-6">
      <h2 id="ai-insights-title" className="sr-only">AI Insights and Recommendations</h2>
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-primary" />
            <CardTitle className="font-headline">Health Impact Analysis</CardTitle>
          </div>
          <CardDescription>AI-powered insights on potential health effects.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAnalysis ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing data...</p>
            </div>
          ) : (
            <ScrollArea className="h-40">
              <p className="text-sm whitespace-pre-wrap">{analysis || 'No analysis available.'}</p>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            <CardTitle className="font-headline">Action Recommendations</CardTitle>
          </div>
          <CardDescription>Suggested actions to improve air quality.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingRecommendations ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generating recommendations...</p>
            </div>
          ) : (
            <ScrollArea className="h-40">
              {recommendations && recommendations.length > 0 && recommendations[0] !== "Could not retrieve recommendations at this time." ? (
                <ul className="space-y-2">
                  {recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start text-sm">
                      <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5 text-accent flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm">{recommendations ? recommendations[0] : 'No recommendations available.'}</p>
              )}
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
