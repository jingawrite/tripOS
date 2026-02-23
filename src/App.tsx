import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AdProvider } from './lib/AdProvider';

function App() {
  return (
    <AdProvider>
      <RouterProvider router={router} />
    </AdProvider>
  );
}

export default App;
