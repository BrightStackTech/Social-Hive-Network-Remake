import React from 'react';

const ComPostSkeletonLoader: React.FC = () => {
  return (
    <div className="relative flex border border-border-dark [html.light_&]:border-border-light mb-6 md:rounded-[2rem] rounded-2xl bg-surface-elevated-dark/10 [html.light_&]:bg-surface-light border-opacity-50 animate-pulse overflow-hidden">
      {/* Left Voting Sidebar Skeleton */}
      <div className="flex flex-col items-center sm:py-6 py-4 px-1.5 sm:px-3 bg-black/[0.03] [html.light_&]:bg-black/[0.01] border-r border-border-dark/20 [html.light_&]:border-border-light/20 sm:min-w-[56px] min-w-[42px] gap-3 shrink-0">
        <div className="sm:w-6 sm:h-6 w-5 h-5 bg-surface-elevated-dark/40 [html.light_&]:bg-gray-200 rounded-lg"></div>
        <div className="sm:w-4 sm:h-4 w-3 h-3 bg-surface-elevated-dark/40 [html.light_&]:bg-gray-200 rounded-md"></div>
        <div className="sm:w-6 sm:h-6 w-5 h-5 bg-surface-elevated-dark/40 [html.light_&]:bg-gray-200 rounded-lg"></div>
      </div>

      {/* Content Area Skeleton */}
      <div className="flex-1 min-w-0 sm:p-4 p-3">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="w-24 h-3 bg-surface-elevated-dark/40 [html.light_&]:bg-gray-200 rounded"></div>
            <div className="hidden sm:block w-1 h-1 bg-surface-elevated-dark/20 rounded-full"></div>
            <div className="w-32 h-3 bg-surface-elevated-dark/40 [html.light_&]:bg-gray-200 rounded"></div>
            <div className="hidden sm:block w-1 h-1 bg-surface-elevated-dark/20 rounded-full"></div>
            <div className="w-16 h-3 bg-surface-elevated-dark/40 [html.light_&]:bg-gray-200 rounded"></div>
          </div>
          <div className="w-4 h-4 bg-surface-elevated-dark/40 [html.light_&]:bg-gray-200 rounded-full sm:opacity-0 group-hover:opacity-100"></div>
        </div>

        {/* Title Skeleton */}
        <div className="w-3/4 h-6 bg-surface-elevated-dark/60 [html.light_&]:bg-gray-300 rounded-lg mb-3"></div>

        {/* Description Skeleton */}
        <div className="space-y-2 mb-6">
          <div className="w-full h-3 bg-surface-elevated-dark/30 [html.light_&]:bg-gray-200 rounded"></div>
          <div className="w-full h-3 bg-surface-elevated-dark/30 [html.light_&]:bg-gray-200 rounded"></div>
          <div className="w-4/5 h-3 bg-surface-elevated-dark/30 [html.light_&]:bg-gray-200 rounded"></div>
        </div>

        {/* Footer Skeleton */}
        <div className="flex items-center gap-4">
          <div className="w-28 h-9 bg-surface-elevated-dark/40 [html.light_&]:bg-gray-200 rounded-xl"></div>
          <div className="w-20 h-7 bg-surface-elevated-dark/40 [html.light_&]:bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
};

export default ComPostSkeletonLoader;