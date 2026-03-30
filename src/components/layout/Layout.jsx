import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ToastContainer from '../ui/Toast';
import { useLocationTracker } from '../../hooks/useLocationTracker';

export default function Layout({ children, title, actions }) {
  // Start GPS tracking for this user (silent — no-op if location denied)
  useLocationTracker();

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar title={title} actions={actions} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
