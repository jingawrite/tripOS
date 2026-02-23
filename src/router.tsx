import { createBrowserRouter } from 'react-router-dom';
import HomePage from './pages/HomePage';
import NewSchedulePage from './pages/NewSchedulePage';
import ScheduleDetailPage from './pages/ScheduleDetailPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/schedule/new',
    element: <NewSchedulePage />,
  },
  {
    path: '/schedule/:id',
    element: <ScheduleDetailPage />,
  },
]);
