import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getCategories } from '../api/index';
import { type Category } from '../components/CategoryCard';

interface CategoryContextType {
  categories: Category[];
  loading: boolean;
  findCategoryByName: (name: string) => Category | undefined;
  refreshCategories: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export function CategoryProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllCategories = async () => {
    setLoading(true);
    try {
      const res = await getCategories(); // No ID passed = fetch all
      setCategories(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCategories();
  }, []);

  const findCategoryByName = (name: string) => {
    return categories.find(c => c.name.toLowerCase() === name.toLowerCase());
  };

  return (
    <CategoryContext.Provider value={{ categories, loading, findCategoryByName, refreshCategories: fetchAllCategories }}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategory() {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategory must be used within CategoryProvider');
  }
  return context;
}
