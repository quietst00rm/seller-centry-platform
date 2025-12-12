'use client';

import { CheckCircle, DollarSign, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface ResolvedKPIMetrics {
  totalResolved: number;
  revenueSaved: number;
  avgResolutionTime: number;
  thisMonthResolved: number;
}

interface ResolvedKPIGridProps {
  metrics: ResolvedKPIMetrics;
}

interface KPICardData {
  icon: React.ReactNode;
  title: string;
  value: string;
  trend: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
    color: 'success' | 'danger' | 'warning' | 'neutral';
  };
}

const trendColors = {
  success: "text-success bg-success/10 border-success/20",
  danger: "text-danger bg-danger/10 border-danger/20",
  warning: "text-warning bg-warning/10 border-warning/20",
  neutral: "text-muted-foreground bg-muted/10 border-border"
};

const statusGlow = {
  success: "shadow-[0_0_15px_hsl(var(--success)/0.4)]",
  danger: "shadow-[0_0_15px_hsl(var(--danger)/0.4)]",
  warning: "shadow-[0_0_15px_hsl(var(--warning)/0.4)]",
  neutral: ""
};

const iconContainerStyles = {
  success: "bg-gradient-to-br from-success/20 to-success/10 border-success/20",
  danger: "bg-gradient-to-br from-danger/20 to-danger/10 border-danger/20",
  warning: "bg-gradient-to-br from-warning/20 to-warning/10 border-warning/20",
  neutral: "bg-gradient-to-br from-muted/20 to-muted/10 border-border"
};

const trendIcons = {
  up: "↗",
  down: "↘",
  neutral: "→"
};

function PremiumKPICard({ card, index }: { card: KPICardData; index: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 100);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div
      className={cn(
        // Base styling with glassmorphism
        "group relative overflow-hidden",
        "bg-gradient-to-br from-card/95 to-card/85 backdrop-blur-sm",
        "border border-white/20 dark:border-white/10",
        "rounded-2xl p-6 text-center",

        // Premium shadows and interactions
        "shadow-glass hover:shadow-premium",
        "transition-all duration-500 ease-premium",
        "hover:scale-[1.02] hover:-translate-y-1",

        // Status-based glow on hover
        isHovered && statusGlow[card.trend.color],

        // Entrance animation
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
        "transform-gpu"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transitionDelay: isVisible ? '0ms' : `${index * 100}ms`
      }}
    >
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Shimmer effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100">
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />
      </div>

      {/* Header with icon and title - centered */}
      <div className="relative flex flex-col items-center justify-center mb-4">
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-xl border mb-3",
          "transition-all duration-300 ease-premium",
          "group-hover:scale-110",
          iconContainerStyles[card.trend.color]
        )}>
          {card.icon}
        </div>

        <h3 className="text-xs font-semibold text-muted-foreground/80 tracking-wide uppercase leading-tight text-center">
          {card.title}
        </h3>
      </div>

      {/* Main value - centered */}
      <div className="relative space-y-3 mb-4 flex flex-col items-center">
        <p className="text-3xl font-bold font-tabular text-foreground leading-none tracking-tight group-hover:scale-105 transition-transform duration-300 transform-gpu">
          {card.value}
        </p>

        {/* Animated underline */}
        <div className={cn(
          "h-0.5 w-0 group-hover:w-12 transition-all duration-500 ease-premium rounded-full mx-auto",
          card.trend.color === "success" && "bg-success",
          card.trend.color === "danger" && "bg-danger",
          card.trend.color === "warning" && "bg-warning",
          card.trend.color === "neutral" && "bg-muted-foreground"
        )} />
      </div>

      {/* Trend indicator - centered */}
      <div className="flex justify-center">
        <div className={cn(
          "inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border",
          "transition-all duration-300 ease-premium",
          "group-hover:scale-105",
          trendColors[card.trend.color]
        )}>
          <span className="text-sm leading-none">{trendIcons[card.trend.direction]}</span>
          <span>{card.trend.value}</span>
        </div>
      </div>

      {/* Status indicator dot */}
      <div className={cn(
        "absolute top-3 right-3 w-1.5 h-1.5 rounded-full",
        "opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        card.trend.color === "success" && "bg-success animate-pulse",
        card.trend.color === "danger" && "bg-danger animate-pulse-glow",
        card.trend.color === "warning" && "bg-warning animate-pulse",
        card.trend.color === "neutral" && "bg-muted-foreground"
      )} />

      {/* Floating background element */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={cn(
          "absolute -bottom-2 -right-2 w-12 h-12 rounded-full opacity-5",
          "transition-all duration-700 ease-premium",
          "group-hover:scale-150 group-hover:opacity-10",
          card.trend.color === "success" && "bg-success",
          card.trend.color === "danger" && "bg-danger",
          card.trend.color === "warning" && "bg-warning",
          card.trend.color === "neutral" && "bg-muted-foreground"
        )} />
      </div>
    </div>
  );
}

export function ResolvedKPIGrid({ metrics }: ResolvedKPIGridProps) {
  const kpiCards: KPICardData[] = [
    {
      icon: <CheckCircle className="h-5 w-5 text-success" />,
      title: "Total Resolved",
      value: metrics.totalResolved.toString(),
      trend: {
        value: "All Time",
        direction: "neutral",
        color: "success"
      }
    },
    {
      icon: <DollarSign className="h-5 w-5 text-success" />,
      title: "Revenue Recovered",
      value: `$${metrics.revenueSaved.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      trend: {
        value: "Total Saved",
        direction: "up",
        color: "success"
      }
    },
    {
      icon: <Clock className="h-5 w-5 text-warning" />,
      title: "Avg Resolution Time",
      value: `${metrics.avgResolutionTime} days`,
      trend: {
        value: "Mean Time",
        direction: "neutral",
        color: "warning"
      }
    },
    {
      icon: <TrendingUp className="h-5 w-5 text-success" />,
      title: "This Month Resolved",
      value: metrics.thisMonthResolved.toString(),
      trend: {
        value: "Current Month",
        direction: "up",
        color: "success"
      }
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {kpiCards.map((card, index) => (
        <PremiumKPICard
          key={card.title}
          card={card}
          index={index}
        />
      ))}
    </div>
  );
}
