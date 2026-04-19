import React, { useEffect, useState } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart 
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { Users, TrendingUp, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';

const GrowthPage: React.FC = () => {
  const { api } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/growth-stats?period=${period}`);
      setData(res.data.data);
    } catch (err) {
      toast.error('Failed to load growth statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period]);

  const stats = [
    { label: 'Total Users', value: data.length > 0 ? data[data.length - 1].users : 0, icon: <Users size={20}/>, color: 'blue' },
    { label: 'Today Signups', value: '...', icon: <TrendingUp size={20}/>, color: 'emerald' },
    { label: 'Growth Rate', value: '+12%', icon: <ArrowUpRight size={20}/>, color: 'purple' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold text-text-dark [html.light_&]:text-text-light font-display">
          Platform Growth
        </h2>
        <p className="text-text-muted-dark [html.light_&]:text-text-muted-light mt-1">
          Monitor your network's expansion and user acquisition metrics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-surface-dark [html.light_&]:bg-white p-6 rounded-2xl border border-border-dark [html.light_&]:border-border-light shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-muted-dark [html.light_&]:text-text-muted-light font-medium">{stat.label}</span>
              <div className={`p-2 rounded-lg bg-${stat.color}-500/10 text-${stat.color}-500`}>
                {stat.icon}
              </div>
            </div>
            <div className="text-2xl font-bold text-text-dark [html.light_&]:text-text-light">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-surface-dark [html.light_&]:bg-white p-8 rounded-3xl border border-border-dark [html.light_&]:border-border-light shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-xl font-bold text-text-dark [html.light_&]:text-text-light">User Trajectory</h3>
            <p className="text-sm text-text-muted-dark [html.light_&]:text-text-muted-light">Cumulative user count over time</p>
          </div>
          
          <div className="flex items-center bg-bg-dark [html.light_&]:bg-slate-50 p-1 rounded-xl">
            {['day', 'week', 'month', 'year', 'all'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  period === p 
                  ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                  : 'text-text-muted-dark [html.light_&]:text-text-muted-light hover:text-text-dark'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[400px] w-full">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4361ee" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4361ee" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: 'none', 
                    borderRadius: '12px',
                    color: '#f8fafc',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
                  }}
                  itemStyle={{ color: '#4361ee' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#4361ee" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorUsers)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-text-muted-dark [html.light_&]:text-text-muted-light">
               No data available for this range
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GrowthPage;
