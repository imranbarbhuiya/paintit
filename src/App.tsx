import { useState } from 'react';

import reactLogo from './assets/react.svg';

function App() {
	const [count, setCount] = useState(0);

	return (
		<div className="flex min-h-screen items-center justify-center bg-gray-50">
			<div className="flex w-full max-w-sm flex-col items-center rounded-xl bg-white p-8 shadow-lg">
				<div className="mb-6 flex gap-6">
					<a href="https://vite.dev" rel="noopener noreferrer" target="_blank">
						<img alt="Vite logo" className="h-12 w-12" src="/vite.svg" />
					</a>
					<a href="https://react.dev" rel="noopener noreferrer" target="_blank">
						<img alt="React logo" className="h-12 w-12" src={reactLogo} />
					</a>
				</div>
				<h1 className="mb-4 text-2xl font-bold text-gray-800">Vite + React + Tailwind</h1>
				<button
					className="mb-4 w-full rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition hover:bg-blue-700"
					onClick={() => setCount((count) => count + 1)}
					type="button"
				>
					Count is {count}
				</button>
				<p className="mb-2 text-sm text-gray-500">
					Edit <code className="rounded bg-gray-100 px-1">src/App.tsx</code> and save to test HMR
				</p>
				<p className="text-xs text-gray-400">Click the logos to learn more</p>
			</div>
		</div>
	);
}

export default App;
