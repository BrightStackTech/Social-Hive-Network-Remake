function PostSkeletonLoader() {
  return (
    <div className="rounded-2xl border border-border-dark [html.light_&]:border-gray-200 glass-dark [html.light_&]:bg-white p-5 mb-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-surface-elevated-dark [html.light_&]:bg-gray-100"></div>
        <div className="flex flex-col gap-1.5">
          <div className="w-24 h-4 bg-surface-elevated-dark [html.light_&]:bg-gray-100 rounded-md"></div>
          <div className="w-16 h-3 bg-surface-elevated-dark [html.light_&]:bg-gray-100 rounded-md"></div>
        </div>
      </div>

      <div className="w-full h-px bg-border-dark [html.light_&]:bg-gray-100 my-4"></div>

      <div className="w-2/3 h-5 bg-surface-elevated-dark [html.light_&]:bg-gray-100 rounded-md mb-2"></div>
      <div className="w-full h-20 bg-surface-elevated-dark [html.light_&]:bg-gray-100 rounded-md"></div>

      <div className="flex items-center justify-around gap-2 mt-4 pt-3 border-t border-border-dark [html.light_&]:border-gray-100">
        <div className="w-12 h-6 bg-surface-elevated-dark [html.light_&]:bg-gray-100 rounded-md"></div>
        <div className="w-12 h-6 bg-surface-elevated-dark [html.light_&]:bg-gray-100 rounded-md"></div>
        <div className="w-12 h-6 bg-surface-elevated-dark [html.light_&]:bg-gray-100 rounded-md"></div>
        <div className="w-12 h-6 bg-surface-elevated-dark [html.light_&]:bg-gray-100 rounded-md"></div>
      </div>
    </div>
  );
}

export default PostSkeletonLoader;