import { useState, useEffect, useRef } from "react";
import { Search, ArrowRight } from "lucide-react";

const ComSearchBar = ({ 
  onChange, 
  onSubmit,
  value,
  placeholder
}: { 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, 
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void,
  value?: string,
  placeholder?: string
}) => {
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const intervalRef = useRef<any>(null);

  const placeholders = ["Search for Communities...", "Find Community posts...", "Discover new Communities..."];

  useEffect(() => {
    startAnimation();
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible" && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      } else if (document.visibilityState === "visible") {
        startAnimation();
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const startAnimation = () => {
    intervalRef.current = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
    }, 3000);
  };

  return (
    <form onSubmit={onSubmit} className="relative w-full max-w-3xl mx-auto group">
      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2
                   text-text-muted-dark [html.light_&]:text-text-muted-light group-focus-within:text-primary transition-colors duration-200"
      />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder || placeholders[currentPlaceholder]}
        className="w-full pl-11 pr-12 py-3 rounded-full text-sm font-medium
                   bg-surface-elevated-dark/50 [html.light_&]:bg-surface-elevated-light/50
                   border border-border-dark [html.light_&]:border-border-light
                   text-text-dark [html.light_&]:text-text-light
                   placeholder:text-text-muted-dark/40 [html.light_&]:placeholder:text-text-muted-light/40
                   focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50
                   transition-all duration-300 backdrop-blur-sm"
      />
      <button
        type="submit"
        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full
                   text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-primary hover:bg-primary/10 transition-all duration-200 cursor-pointer active:scale-90"
        aria-label="Search"
      >
        <ArrowRight size={18} />
      </button>
    </form>
  );
};

export default ComSearchBar;

