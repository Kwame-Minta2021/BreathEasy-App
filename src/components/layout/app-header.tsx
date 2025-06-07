import { FileText, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggleButton } from "@/components/theme-toggle-button";

export function AppHeader() {
  const handlePdfReport = () => {
    // In a real app, you would use a library like jsPDF or react-pdf
    // or make a server request to generate the PDF.
    alert("PDF report generation is a premium feature coming soon!");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Leaf className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-primary font-headline">BreathEasy</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handlePdfReport}>
            <FileText className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
          <ThemeToggleButton />
        </div>
      </div>
    </header>
  );
}
