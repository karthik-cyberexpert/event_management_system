import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ThemeColors = () => {
  const colors = [
    { name: "Primary", className: "bg-primary", variable: "--primary" },
    { name: "Primary Foreground", className: "bg-primary-foreground", variable: "--primary-foreground" },
    { name: "Secondary", className: "bg-secondary", variable: "--secondary" },
    { name: "Secondary Foreground", className: "bg-secondary-foreground", variable: "--secondary-foreground" },
    { name: "Accent", className: "bg-accent", variable: "--accent" },
    { name: "Accent Foreground", className: "bg-accent-foreground", variable: "--accent-foreground" },
    { name: "Muted", className: "bg-muted", variable: "--muted" },
    { name: "Muted Foreground", className: "bg-muted-foreground", variable: "--muted-foreground" },
    { name: "Destructive", className: "bg-destructive", variable: "--destructive" },
    { name: "Destructive Foreground", className: "bg-destructive-foreground", variable: "--destructive-foreground" },
    { name: "Background", className: "bg-background", variable: "--background" },
    { name: "Foreground", className: "bg-foreground", variable: "--foreground" },
    { name: "Border", className: "bg-border", variable: "--border" },
    { name: "Input", className: "bg-input", variable: "--input" },
    { name: "Ring", className: "bg-ring", variable: "--ring" },
    { name: "Sidebar Background", className: "bg-sidebar", variable: "--sidebar-background" },
    { name: "Sidebar Foreground", className: "bg-sidebar-foreground", variable: "--sidebar-foreground" },
    { name: "Sidebar Primary", className: "bg-sidebar-primary", variable: "--sidebar-primary" },
    { name: "Sidebar Primary Foreground", className: "bg-sidebar-primary-foreground", variable: "--sidebar-primary-foreground" },
    { name: "Sidebar Accent", className: "bg-sidebar-accent", variable: "--sidebar-accent" },
    { name: "Sidebar Accent Foreground", className: "bg-sidebar-accent-foreground", variable: "--sidebar-accent-foreground" },
    { name: "Sidebar Border", className: "bg-sidebar-border", variable: "--sidebar-border" },
    { name: "Sidebar Ring", className: "bg-sidebar-ring", variable: "--sidebar-ring" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme Colors</CardTitle>
        <CardDescription>Current color palette used throughout the application</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {colors.map((color) => (
            <div key={color.variable} className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-lg ${color.className} border border-border mb-2`}></div>
              <span className="text-sm font-medium">{color.name}</span>
              <span className="text-xs text-muted-foreground">{color.variable}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ThemeColors;