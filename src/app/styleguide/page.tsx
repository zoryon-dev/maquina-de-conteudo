import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Info } from "lucide-react"

export default function StyleguidePage() {
  const colorSwatches = [
    { name: "Primary", bg: "bg-primary", text: "text-primary-foreground", cssVar: "--primary", hex: "#a3e635" },
    { name: "Secondary", bg: "bg-secondary", text: "text-secondary-foreground", cssVar: "--secondary", hex: "hsl(var(--secondary))" },
    { name: "Accent", bg: "bg-accent", text: "text-accent-foreground", cssVar: "--accent", hex: "hsl(var(--accent))" },
    { name: "Muted", bg: "bg-muted", text: "text-muted-foreground", cssVar: "--muted", hex: "hsl(var(--muted))" },
    { name: "Destructive", bg: "bg-destructive", text: "text-destructive-foreground", cssVar: "--destructive", hex: "hsl(var(--destructive))" },
  ]

  const semanticColors = [
    { name: "Success", bg: "bg-[hsl(var(--success))]", text: "text-[hsl(var(--success-foreground))]", cssVar: "--success", hex: "#22c55e" },
    { name: "Warning", bg: "bg-[hsl(var(--warning))]", text: "text-[hsl(var(--warning-foreground))]", cssVar: "--warning", hex: "#f59e0b" },
    { name: "Info", bg: "bg-[hsl(var(--info))]", text: "text-[hsl(var(--info-foreground))]", cssVar: "--info", hex: "#3b82f6" },
  ]

  const chartColors = [
    { name: "Chart 1", bg: "bg-[hsl(var(--chart-1))]", cssVar: "--chart-1", description: "Primary Lime" },
    { name: "Chart 2", bg: "bg-[hsl(var(--chart-2))]", cssVar: "--chart-2", description: "Purple" },
    { name: "Chart 3", bg: "bg-[hsl(var(--chart-3))]", cssVar: "--chart-3", description: "Indigo" },
    { name: "Chart 4", bg: "bg-[hsl(var(--chart-4))]", cssVar: "--chart-4", description: "Green" },
    { name: "Chart 5", bg: "bg-[hsl(var(--chart-5))]", cssVar: "--chart-5", description: "Teal" },
  ]

  const borderRadii = [
    { name: "sm", value: "radius-sm", class: "rounded-sm" },
    { name: "md", value: "radius-md", class: "rounded-md" },
    { name: "lg (default)", value: "radius-lg", class: "rounded-lg" },
    { name: "xl", value: "radius-xl", class: "rounded-xl" },
    { name: "2xl", value: "radius-2xl", class: "rounded-2xl" },
    { name: "3xl", value: "radius-3xl", class: "rounded-3xl" },
    { name: "full", value: "full", class: "rounded-full" },
  ]

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Design Tokens</h1>
        <p className="text-muted-foreground mt-2">
          Core design tokens for the Máquina de Conteúdo design system.
        </p>
      </div>

      {/* Design Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Design Summary</CardTitle>
          <CardDescription>Key characteristics extracted from the design reference</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Primary Color</p>
              <p className="font-mono font-medium">#a3e635 (Lime)</p>
            </div>
            <div>
              <p className="text-muted-foreground">Font</p>
              <p className="font-medium">Inter</p>
            </div>
            <div>
              <p className="text-muted-foreground">Style</p>
              <p className="font-medium">Modern Dark Dashboard</p>
            </div>
            <div>
              <p className="text-muted-foreground">Border Radius</p>
              <p className="font-medium">12px (rounded-lg)</p>
            </div>
            <div>
              <p className="text-muted-foreground">Overall Feel</p>
              <p className="font-medium">Data-driven, vibrant</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Core Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Core Colors</CardTitle>
          <CardDescription>Primary color palette for the design system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {colorSwatches.map((color) => (
              <div key={color.name} className="space-y-2">
                <div className={`h-24 ${color.bg} ${color.text} rounded-lg flex items-center justify-center font-medium`}>
                  {color.name}
                </div>
                <div className="text-sm space-y-1">
                  <p className="font-medium">{color.name}</p>
                  <p className="text-muted-foreground text-xs">{color.hex}</p>
                  <p className="text-muted-foreground text-xs font-mono">{color.cssVar}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Semantic Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Semantic Colors</CardTitle>
          <CardDescription>Status and feedback colors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {semanticColors.map((color) => (
              <div key={color.name} className="space-y-2">
                <div className={`h-20 ${color.bg} ${color.text} rounded-lg flex items-center justify-center font-medium`}>
                  {color.name}
                </div>
                <div className="text-sm space-y-1">
                  <p className="font-medium">{color.name}</p>
                  <p className="text-muted-foreground text-xs">{color.hex}</p>
                  <p className="text-muted-foreground text-xs font-mono">{color.cssVar}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chart Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Chart Colors</CardTitle>
          <CardDescription>Colors for data visualizations and charts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {chartColors.map((color) => (
              <div key={color.name} className="space-y-2">
                <div className={`h-16 ${color.bg} rounded-lg`} />
                <div className="text-sm space-y-1">
                  <p className="font-medium">{color.name}</p>
                  <p className="text-muted-foreground text-xs">{color.description}</p>
                  <p className="text-muted-foreground text-xs font-mono">{color.cssVar}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Background & Surface */}
      <Card>
        <CardHeader>
          <CardTitle>Background & Surface</CardTitle>
          <CardDescription>Page and container backgrounds</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-background rounded-lg border" />
            <div>
              <p className="font-medium">Background</p>
              <p className="text-sm text-muted-foreground">Main page background</p>
              <p className="text-xs font-mono text-muted-foreground">--background</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-card rounded-lg border" />
            <div>
              <p className="font-medium">Card</p>
              <p className="text-sm text-muted-foreground">Card/surface background</p>
              <p className="text-xs font-mono text-muted-foreground">--card</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-popover rounded-lg border" />
            <div>
              <p className="font-medium">Popover</p>
              <p className="text-sm text-muted-foreground">Dropdown/tooltip backgrounds</p>
              <p className="text-xs font-mono text-muted-foreground">--popover</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typography */}
      <Card>
        <CardHeader>
          <CardTitle>Typography</CardTitle>
          <CardDescription>Font family: Inter (Google Fonts)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Heading 1</p>
            <h1 className="text-4xl font-bold">Heading One</h1>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Heading 2</p>
            <h2 className="text-3xl font-semibold">Heading Two</h2>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Heading 3</p>
            <h3 className="text-2xl font-semibold">Heading Three</h3>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Heading 4</p>
            <h4 className="text-xl font-medium">Heading Four</h4>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Body Large</p>
            <p className="text-lg">Body text large size for emphasis and important content.</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Body Base</p>
            <p>Body text base size for general content and paragraph text.</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Body Small</p>
            <p className="text-sm text-muted-foreground">Body text small size for secondary information.</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Monospace</p>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">const code = "monospace text";</code>
          </div>
        </CardContent>
      </Card>

      {/* Border Radius */}
      <Card>
        <CardHeader>
          <CardTitle>Border Radius</CardTitle>
          <CardDescription>Border radius scale (default: 12px)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
            {borderRadii.map((radius) => (
              <div key={radius.name} className="space-y-2">
                <div className={`h-16 bg-muted ${radius.class} flex items-center justify-center`}>
                  <span className="text-xs">{radius.name}</span>
                </div>
                <p className="text-xs text-muted-foreground text-center font-mono">{radius.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Shadows */}
      <Card>
        <CardHeader>
          <CardTitle>Shadows</CardTitle>
          <CardDescription>Shadow effects for depth and elevation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="h-20 bg-card rounded-lg shadow-sm" />
              <p className="text-xs text-muted-foreground text-center">shadow-sm</p>
            </div>
            <div className="space-y-2">
              <div className="h-20 bg-card rounded-lg shadow" />
              <p className="text-xs text-muted-foreground text-center">shadow</p>
            </div>
            <div className="space-y-2">
              <div className="h-20 bg-card rounded-lg shadow-md" />
              <p className="text-xs text-muted-foreground text-center">shadow-md</p>
            </div>
            <div className="space-y-2">
              <div className="h-20 bg-card rounded-lg shadow-lg" />
              <p className="text-xs text-muted-foreground text-center">shadow-lg</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Custom Effects</p>
            <div className="flex gap-4">
              <div className="h-20 bg-primary rounded-lg glow-primary w-32 flex items-center justify-center text-primary-foreground text-sm">
                Glow Primary
              </div>
              <div className="h-20 bg-muted rounded-lg glass w-32 flex items-center justify-center text-sm">
                Glass
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Component Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Component Examples</CardTitle>
          <CardDescription>Sample components using the design tokens</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Buttons */}
          <div>
            <h3 className="text-sm font-medium mb-4">Buttons</h3>
            <div className="flex flex-wrap gap-3">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon">
                <Info className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Badges */}
          <div>
            <h3 className="text-sm font-medium mb-4">Badges</h3>
            <div className="flex flex-wrap gap-3">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>
          </div>

          {/* Alerts */}
          <div>
            <h3 className="text-sm font-medium mb-4">Alerts</h3>
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Default Alert</AlertTitle>
                <AlertDescription>
                  This is a default alert for general information.
                </AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <AlertTitle>Destructive Alert</AlertTitle>
                <AlertDescription>
                  This is a destructive alert for error messages.
                </AlertDescription>
              </Alert>
            </div>
          </div>

          {/* Radio Group */}
          <div>
            <h3 className="text-sm font-medium mb-4">Radio Group</h3>
            <RadioGroup defaultValue="option1">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option1" id="option1" />
                <Label htmlFor="option1">Option One</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option2" id="option2" />
                <Label htmlFor="option2">Option Two</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="option3" id="option3" />
                <Label htmlFor="option3">Option Three</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Dark Mode Preview */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Dark Mode</CardTitle>
          <CardDescription>
            Toggle dark mode using the button in the sidebar to preview both themes.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
