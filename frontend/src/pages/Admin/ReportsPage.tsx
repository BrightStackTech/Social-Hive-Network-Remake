import React, { useEffect, useState } from 'react';
import { Search, ShieldAlert, ExternalLink, User, FileText, Image as ImageIcon, Film, Clock, UserX } from 'lucide-react';
import { getAllReportsForAdmin } from '../../api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Report {
  _id: string;
  reportedUser?: {
    _id: string;
    username: string;
    profilePicture: string;
  };
  reportedBy: {
    _id: string;
    username: string;
    profilePicture: string;
  };
  reportedEmail: string;
  description: string;
  media?: string;
  mediaType?: 'image' | 'video';
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: string;
}

const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await getAllReportsForAdmin();
      setReports(res.data.data);
    } catch (error) {
      toast.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const filteredReports = reports.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.reportedEmail?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.reportedBy?.username?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header section with Stats & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
              <ShieldAlert size={28} />
            </div>
            <h1 className="text-3xl font-display font-black text-text-dark [html.light_&]:text-text-light tracking-tight">
              User Reports
            </h1>
          </div>
          <p className="text-text-muted-dark [html.light_&]:text-text-muted-light font-medium pl-14">
            Manage and review platform safety violations
          </p>
        </div>

        {/* Search Box */}
        <div className="relative group w-full md:w-96">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by email or description..."
            className="w-full bg-surface-dark [html.light_&]:bg-white border border-border-dark [html.light_&]:border-border-light rounded-2xl py-3.5 pl-12 pr-4 text-text-dark [html.light_&]:text-text-light focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted-dark [html.light_&]:text-text-muted-light group-focus-within:text-primary transition-colors" size={20} />
        </div>
      </div>

      {/* Search result count */}
      {!loading && searchQuery.trim() && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm font-semibold text-primary">
            <Search size={13} />
            {filteredReports.length} result{filteredReports.length !== 1 ? 's' : ''} for &ldquo;{searchQuery}&rdquo;
          </span>
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-text-muted-dark hover:text-primary transition-colors font-medium"
          >
            Clear
          </button>
        </div>
      )}

      {/* Reports Grid/Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-text-muted-dark font-medium animate-pulse">Fetching latest reports...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="bg-surface-dark [html.light_&]:bg-white border border-border-dark [html.light_&]:border-border-light rounded-3xl p-16 text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
             <FileText size={40} className="text-text-muted-dark" />
          </div>
          <h3 className="text-xl font-bold text-text-dark [html.light_&]:text-text-light mb-2">No Reports Found</h3>
          <p className="text-text-muted-dark max-w-sm mx-auto">
            {searchQuery ? `We couldn't find any reports matching "${searchQuery}".` : "All clear! There are currently no pending user reports."}
          </p>
          {searchQuery && (
            <button 
                onClick={() => setSearchQuery('')}
                className="mt-6 text-primary font-bold hover:underline"
            >
                Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredReports.map((report) => (
            <div 
              key={report._id}
              className="bg-surface-dark [html.light_&]:bg-white border border-border-dark [html.light_&]:border-border-light rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow group overflow-hidden relative"
            >
              <div className="flex flex-col gap-6">
                {/* Reporter & Target info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-text-muted-dark uppercase tracking-widest flex items-center gap-1.5">
                      <User size={12} /> Reported By
                    </span>
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={report.reportedBy.profilePicture || `https://ui-avatars.com/api/?name=${report.reportedBy.username}`} 
                        className="w-8 h-8 rounded-full border border-border-dark shadow-sm"
                        alt=""
                      />
                      <span className="font-bold text-sm text-text-dark [html.light_&]:text-text-light">
                        @{report.reportedBy.username}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 border-l border-border-dark [html.light_&]:border-border-light pl-4">
                    <span className="text-[10px] font-bold text-text-muted-dark uppercase tracking-widest flex items-center gap-1.5">
                      <ShieldAlert size={12} className="text-rose-500" /> Target Email
                    </span>
                    <div className="flex flex-col min-w-0 gap-2.5">
                      <span className="font-bold text-sm text-text-dark [html.light_&]:text-text-light truncate" title={report.reportedEmail}>
                        {report.reportedEmail}
                      </span>
                      <button
                        onClick={() => navigate('/secured/admin/freeze-user', { state: { emailToFreeze: report.reportedEmail } })}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-widest group/btn w-fit"
                      >
                        <UserX size={12} className="group-hover/btn:scale-110 transition-transform" />
                        Freeze this email
                      </button>
                    </div>
                  </div>
                </div>

                {/* Violation Description */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-text-muted-dark uppercase tracking-widest flex items-center gap-1.5">
                      <FileText size={12} /> Violation Details
                    </span>
                    <span className="text-[10px] font-medium text-text-muted-dark flex items-center gap-1">
                      <Clock size={12} /> {format(new Date(report.createdAt), 'MMM dd, yyyy • HH:mm')}
                    </span>
                  </div>
                  <div className="bg-slate-500/5 rounded-2xl p-4 border border-border-dark [html.light_&]:border-border-light relative overflow-hidden">
                    <p className="text-sm text-text-dark [html.light_&]:text-text-light leading-relaxed whitespace-pre-wrap">
                      {report.description}
                    </p>
                  </div>
                </div>

                {/* Media Evidence */}
                {report.media && (
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-text-muted-dark uppercase tracking-widest flex items-center gap-1.5">
                      {report.mediaType === 'video' ? <Film size={12} /> : <ImageIcon size={12} />} Evidence Attachment
                    </span>
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-border-dark [html.light_&]:border-border-light bg-black/20 group/media">
                      {report.mediaType === 'video' ? (
                        <video src={report.media} className="w-full h-full object-cover" controls />
                      ) : (
                        <img src={report.media} className="w-full h-full object-cover" alt="Evidence" />
                      )}
                      <a 
                        href={report.media} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-lg opacity-0 group-hover/media:opacity-100 transition-opacity hover:bg-primary"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
