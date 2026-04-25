import Link from "next/link";

const steps = [
  { number: 1, label: "Business", href: "/onboarding/business" },
  { number: 2, label: "Branch", href: "/onboarding/branch" },
  { number: 3, label: "Products", href: "/onboarding/products" },
  { number: 4, label: "Team", href: "/onboarding/team" },
];

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentStep = 1; // TODO: Determine current step

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground text-center mb-2">
            Setup Your Shop
          </h1>
          <p className="text-muted-foreground text-center">
            Complete the steps to get started
          </p>
        </div>

        <nav aria-label="Progress" className="mb-8">
          <ol className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isCompleted = step.number < currentStep;
              const isCurrent = step.number === currentStep;
              
              return (
                <li key={step.number} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        isCompleted
                          ? "bg-primary text-primary-foreground"
                          : isCurrent
                          ? "bg-primary text-primary-foreground ring-2 ring-ring ring-offset-2"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? "✓" : step.number}
                    </div>
                    <span
                      className={`text-xs mt-1 ${
                        isCurrent
                          ? "text-primary font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-16 sm:w-24 h-0.5 mx-2 ${
                        isCompleted ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="bg-card border rounded-lg p-6 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}