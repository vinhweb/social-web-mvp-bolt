import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import EditProfilePage from './pages/EditProfilePage';
import ExplorePage from './pages/ExplorePage';
import NotificationsPage from './pages/NotificationsPage';
import MessagesPage from './pages/MessagesPage';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const path = window.location.pathname;

  if (!user) {
    if (path === '/signup') {
      return <SignupPage />;
    }
    return <LoginPage />;
  }

  return (
    <Layout>
      {path === '/' && <FeedPage />}
      {path === '/explore' && <ExplorePage />}
      {path === '/notifications' && <NotificationsPage />}
      {path === '/messages' && <MessagesPage />}
      {path === '/profile/edit' && <EditProfilePage />}
      {path.startsWith('/profile/') && path !== '/profile/edit' && (
        <ProfilePage username={path.split('/profile/')[1]} />
      )}
    </Layout>
  );
}

export default App;
