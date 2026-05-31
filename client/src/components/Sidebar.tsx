import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { interviewApi, HistoryItem } from '../api/interview';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await interviewApi.delete(deleteConfirmId);
      setHistory((prev) => prev.filter((item) => item.id !== deleteConfirmId));
      if (location.pathname === `/interviews/session/${deleteConfirmId}`) {
        navigate('/interviews');
      }
      toast.success('Simulação excluída com sucesso');
    } catch (err: unknown) {
      console.error(err);
      toast.error('Erro ao excluir simulação');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const userStr = localStorage.getItem('user');
  let userId: string | undefined;

  if (userStr) {
    try {
      const parsed = JSON.parse(userStr);
      if (parsed && typeof parsed === 'object' && 'id' in parsed && typeof parsed.id === 'string') {
        userId = parsed.id;
      }
    } catch (err) {
      console.log(err)
    }
  }

  useEffect(() => {
    if (!userId) return;

    const fetchHistory = () => {
      interviewApi.getHistory(userId)
        .then((data) => setHistory(data))
        .catch((err) => console.error('[Sidebar] Error fetching history:', err));
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 5000);

    return () => clearInterval(interval);
  }, [userId, location.pathname]);

  return (
    <nav className="bg-zinc-800 w-64 h-screen flex flex-col border-r border-zinc-700">
      <div className="p-6 border-b border-zinc-700">
        <h1 className="text-xl font-bold text-white">The Mirror</h1>
      </div>

      <div className="flex-1 p-4 flex flex-col min-h-0">
        <div className="space-y-2 flex-shrink-0">
          <div>
            <Link
              to="/interviews"
              className="flex items-center px-4 py-3 text-zinc-300 hover:bg-red-900/40 rounded-lg transition-colors group"
            >
              <svg className="w-5 h-5 mr-3 text-red-500 group-hover:text-red-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <span className="font-medium text-red-400 group-hover:text-red-300">Entrevistas</span>
            </Link>
          </div>
        </div>

        <div className="mt-6 flex-1 flex flex-col min-h-0">
          <h3 className="px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Histórico</h3>
          <div className="flex-1 overflow-y-auto pr-1 space-y-1 scrollbar-thin">
            {history.length === 0 ? (
              <div className="px-4 py-2 text-xs text-zinc-500 italic">Nenhuma entrevista realizada</div>
            ) : (
              history.map((item) => {
                const isActive = location.pathname === `/interviews/session/${item.id}`;
                const firstAiMsg = item.history?.find((turn) => turn.role === 'interviewer');
                const fullDisplayName = firstAiMsg?.content || item.scenario.title;
                const displayName = fullDisplayName.length > 40
                  ? fullDisplayName.substring(0, 40) + '...'
                  : fullDisplayName;
                return (
                  <div
                    key={item.id}
                    className={`relative group flex items-center rounded-lg transition-colors border ${isActive
                        ? 'bg-zinc-700/40 border-zinc-600'
                        : 'hover:bg-zinc-700/20 border-transparent'
                      }`}
                  >
                    <Link
                      to={`/interviews/session/${item.id}`}
                      className={`flex-1 flex flex-col px-4 py-2 pr-8 text-sm min-w-0 ${isActive ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
                    >
                      <span className="font-medium truncate block" title={fullDisplayName}>{displayName}</span>
                      <div className="flex items-center justify-between mt-1 text-[10px]">
                        {item.verdict ? (
                          <span className={`px-1 py-0.5 rounded-[3px] font-bold uppercase ${item.verdict === 'APROVADO'
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                            {item.verdict}
                          </span>
                        ) : (
                          <span className="bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 px-1 py-0.5 rounded-[3px] font-bold uppercase">
                            Em progresso
                          </span>
                        )}
                        <span className="text-zinc-500">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </Link>
                    <button
                      onClick={(e) => handleDelete(e, item.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                      title="Excluir simulação"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-700 p-4 mt-auto flex-shrink-0">
        <button
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
          }}
          className="cursor-pointer flex items-center w-full px-4 py-3 text-zinc-300 hover:bg-red-500/50 rounded-lg transition-colors group"
        >
          <svg className="w-5 h-5 mr-3 text-zinc-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="font-medium">Sair</span>
        </button>
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-white mb-2">Excluir Simulação</h3>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              Tem certeza que deseja excluir esta simulação? Esta ação é permanente e não poderá ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
