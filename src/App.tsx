import clsx from 'clsx';
import { Pencil, Eraser, Trash2, Undo, Redo, ChevronDown, Download, Image, Copy, Menu } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line } from 'react-konva';

import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

type Tool = 'pen' | 'eraser';

interface DrawingLine {
	color: string;
	points: number[];
	size: number;
	tool: Tool;
}

const PREDEFINED_COLORS = ['#df4b26', '#000000', '#ffffff', '#1e90ff', '#32cd32', '#ff69b4', '#ffa500', '#8a2be2'];

const SIZE_OPTIONS = [2, 4, 6, 8, 12, 16, 20, 24];

const App = () => {
	const [tool, setTool] = useState<Tool>('pen');
	const [lines, setLines] = useState<DrawingLine[]>([]);
	const [history, setHistory] = useState<DrawingLine[][]>([[]]);
	const [historyStep, setHistoryStep] = useState(0);
	const [color, setColor] = useState<string>(PREDEFINED_COLORS[0]);
	const [showToolbox, setShowToolbox] = useState(true);
	const [penSize, setPenSize] = useState<number>(6);
	const [eraserSize, setEraserSize] = useState<number>(12);
	const [mobileToolboxOpen, setMobileToolboxOpen] = useState(false);
	const isDrawing = useRef(false);
	const stageRef = useRef<any>(null);
	const isMobile = useIsMobile();

	const currentSize = tool === 'pen' ? penSize : eraserSize;
	const setCurrentSize = tool === 'pen' ? setPenSize : setEraserSize;

	const handleExportPNG = useCallback(() => {
		if (stageRef.current) {
			const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
			const link = document.createElement('a');
			link.download = 'drawing.png';
			link.href = uri;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	}, []);

	const handleCopyToClipboard = useCallback(async () => {
		if (stageRef.current) {
			const uri = stageRef.current.toDataURL({ pixelRatio: 2 });
			try {
				const response = await fetch(uri);
				const blob = await response.blob();
				await navigator.clipboard.write([
					new ClipboardItem({
						'image/png': blob,
					}),
				]);
			} catch (error) {
				console.error('Failed to copy image to clipboard:', error);
			}
		}
	}, []);

	const handleUndo = useCallback(() => {
		if (historyStep > 0) {
			setHistoryStep((prev) => prev - 1);
			setLines(history[historyStep - 1] || []);
		}
	}, [historyStep, history]);

	const handleRedo = useCallback(() => {
		if (historyStep < history.length - 1) {
			setHistoryStep((prev) => prev + 1);
			setLines(history[historyStep + 1]);
		}
	}, [historyStep, history]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.metaKey || event.ctrlKey) {
				switch (event.key.toLowerCase()) {
					case 's':
						event.preventDefault();
						handleExportPNG();
						break;
					case 'c':
						event.preventDefault();
						void handleCopyToClipboard();
						break;
					case 'z':
						if (event.shiftKey) {
							event.preventDefault();
							handleRedo();
						} else {
							event.preventDefault();
							handleUndo();
						}
						break;
					case 'y':
						event.preventDefault();
						handleRedo();
						break;
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [handleExportPNG, handleCopyToClipboard, handleUndo, handleRedo]);

	const handleMouseDown = (event: any) => {
		isDrawing.current = true;
		setShowToolbox(false);
		const pos = event.target.getStage().getPointerPosition();
		const newLine: DrawingLine = { tool, points: [pos.x, pos.y], color, size: currentSize };
		setLines((prevLines) => [...prevLines, newLine]);
	};

	const handleMouseMove = (event: any) => {
		if (!isDrawing.current) return;
		const stage = event.target.getStage();
		const point = stage.getPointerPosition();
		setLines((prevLines) => {
			if (prevLines.length === 0) return prevLines;
			const lastLine = prevLines[prevLines.length - 1];
			const updatedLine = {
				...lastLine,
				points: lastLine.points.concat([point.x, point.y]),
			};
			return [...prevLines.slice(0, -1), updatedLine];
		});
	};

	const handleMouseUp = () => {
		isDrawing.current = false;
		setTimeout(() => setShowToolbox(true), 200);

		setHistory((prevHistory) => [...prevHistory.slice(0, historyStep + 1), [...lines]]);
		setHistoryStep((prev) => prev + 1);
	};

	const handleClearCanvas = () => {
		setLines([]);
		setHistory((prevHistory) => [...prevHistory.slice(0, historyStep + 1), []]);
		setHistoryStep((prev) => prev + 1);
	};

	const handleToolClick = (selectedTool: Tool) => {
		setTool(selectedTool);
	};

	const getLineProps = (line: DrawingLine) => ({
		points: line.points,
		stroke: line.tool === 'pen' ? line.color : '#000',
		strokeWidth: line.size,
		globalCompositeOperation: line.tool === 'eraser' ? ('destination-out' as const) : ('source-over' as const),
		tension: 0.5,
		lineCap: 'round' as const,
		lineJoin: 'round' as const,
	});

	const renderDesktopToolbar = () => (
		<div className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-3 rounded-2xl border border-white/20 bg-white/95 px-6 py-4 shadow-2xl backdrop-blur-sm">
			<div className="flex w-full items-center justify-center gap-8">
				<div className="flex flex-col items-center gap-2">
					<span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase">Colors</span>
					<div className="flex items-center gap-3">
						<div className="flex items-center gap-2">
							{PREDEFINED_COLORS.map((colorOption) => (
								<button
									aria-label={`Select color ${colorOption}`}
									className={clsx(
										'h-7 w-7 rounded-full border-2 transition-all duration-200 hover:scale-110',
										color === colorOption
											? 'border-indigo-500 ring-2 ring-indigo-200'
											: 'border-gray-300 hover:border-gray-400',
									)}
									key={colorOption}
									onClick={() => setColor(colorOption)}
									style={{ background: colorOption }}
									type="button"
								/>
							))}
						</div>
						<input
							aria-label="Pick a custom color"
							className="h-8 w-8 cursor-pointer rounded-full border-2 border-gray-300 transition-all duration-200 hover:border-gray-400"
							onChange={(event) => setColor(event.target.value)}
							type="color"
							value={color}
						/>
					</div>
				</div>
				<div className="h-12 w-px bg-gray-200" />
				<div className="flex flex-col items-center gap-2">
					<span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase">Tools</span>
					<div className="flex gap-1">
						<button
							aria-label="Pen tool"
							className={clsx(
								'flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200',
								tool === 'pen' ? 'bg-indigo-500 text-white shadow-lg' : 'bg-gray-100 text-indigo-600 hover:bg-gray-200',
							)}
							onClick={() => handleToolClick('pen')}
							type="button"
						>
							<Pencil size={20} />
						</button>
						<button
							aria-label="Eraser tool"
							className={clsx(
								'flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200',
								tool === 'eraser'
									? 'bg-indigo-500 text-white shadow-lg'
									: 'bg-gray-100 text-indigo-600 hover:bg-gray-200',
							)}
							onClick={() => handleToolClick('eraser')}
							type="button"
						>
							<Eraser size={20} />
						</button>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									className={clsx(
										'h-10 gap-2 rounded-xl px-3 transition-all duration-200',
										'bg-gray-100 text-indigo-600 hover:bg-gray-200',
									)}
									size="sm"
									variant="ghost"
								>
									<div
										className={clsx('rounded-full', tool === 'eraser' ? 'bg-gray-400' : 'bg-indigo-600')}
										style={{
											width: Math.max(currentSize / 2, 4),
											height: Math.max(currentSize / 2, 4),
										}}
									/>
									<span className="text-xs font-medium">{currentSize}px</span>
									<ChevronDown size={14} />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="center" className="w-32">
								{SIZE_OPTIONS.map((option) => (
									<DropdownMenuItem
										className="flex cursor-pointer items-center justify-between"
										key={option}
										onClick={() => setCurrentSize(option)}
									>
										<div className="flex items-center gap-2">
											<div
												className={clsx('rounded-full', tool === 'eraser' ? 'bg-gray-400' : 'bg-indigo-600')}
												style={{
													width: Math.max(option / 2, 4),
													height: Math.max(option / 2, 4),
												}}
											/>
											<span className="text-sm">{option}px</span>
										</div>
										{currentSize === option && <div className="h-2 w-2 rounded-full bg-indigo-600" />}
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
				<div className="h-12 w-px bg-gray-200" />
				<div className="flex flex-col items-center gap-2">
					<span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase">Actions</span>
					<div className="flex items-center gap-1">
						<button
							aria-label="Undo"
							className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-all duration-200 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={historyStep <= 0}
							onClick={handleUndo}
							type="button"
						>
							<Undo size={18} />
						</button>
						<button
							aria-label="Redo"
							className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-all duration-200 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
							disabled={historyStep >= history.length - 1}
							onClick={handleRedo}
							type="button"
						>
							<Redo size={18} />
						</button>
						<button
							aria-label="Clear canvas"
							className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 transition-all duration-200 hover:bg-red-200"
							onClick={handleClearCanvas}
							type="button"
						>
							<Trash2 size={18} />
						</button>
					</div>
				</div>
			</div>
		</div>
	);

	const renderMobileFloatingMenu = () => (
		<div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2">
			<button
				aria-label="Pen tool"
				className={clsx(
					'flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200',
					tool === 'pen' ? 'bg-indigo-500 text-white' : 'bg-white text-indigo-600 hover:bg-gray-50',
				)}
				onClick={() => handleToolClick('pen')}
				type="button"
			>
				<Pencil size={20} />
			</button>
			<button
				aria-label="Eraser tool"
				className={clsx(
					'flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200',
					tool === 'eraser' ? 'bg-indigo-500 text-white' : 'bg-white text-indigo-600 hover:bg-gray-50',
				)}
				onClick={() => handleToolClick('eraser')}
				type="button"
			>
				<Eraser size={20} />
			</button>
		</div>
	);

	const renderMobileSettingsSheet = () => (
		<Sheet onOpenChange={setMobileToolboxOpen} open={mobileToolboxOpen}>
			<SheetTrigger asChild>
				<Button
					className="fixed right-4 bottom-4 z-50 h-12 w-12 rounded-full bg-indigo-500 p-0 shadow-lg hover:bg-indigo-600"
					size="sm"
				>
					<Menu className="h-6 w-6 text-white" />
				</Button>
			</SheetTrigger>
			<SheetContent className="w-80" side="right">
				<div className="flex h-full flex-col">
					<SheetHeader className="pb-4">
						<SheetTitle className="text-lg font-semibold text-gray-800">Drawing Settings</SheetTitle>
					</SheetHeader>
					<div className="flex-1 space-y-4 overflow-y-auto pb-6">
						<div className="rounded-lg border border-gray-200 bg-white p-3">
							<div className="mb-3">
								<span className="text-sm font-medium text-gray-700">Colors</span>
							</div>
							<div className="space-y-3">
								<div className="flex flex-wrap gap-2">
									{PREDEFINED_COLORS.map((colorOption) => (
										<button
											aria-label={`Select color ${colorOption}`}
											className={clsx(
												'h-8 w-8 rounded-full border-2 transition-all duration-200 hover:scale-110',
												color === colorOption
													? 'border-indigo-500 ring-2 ring-indigo-200'
													: 'border-gray-300 hover:border-gray-400',
											)}
											key={colorOption}
											onClick={() => setColor(colorOption)}
											style={{ background: colorOption }}
											type="button"
										/>
									))}
								</div>
								<div className="flex items-center gap-3">
									<input
										aria-label="Pick a custom color"
										className="h-8 w-8 cursor-pointer rounded-full border-2 border-gray-300 transition-all duration-200 hover:border-gray-400"
										onChange={(event) => setColor(event.target.value)}
										type="color"
										value={color}
									/>
									<span className="text-sm text-gray-500">Custom Color</span>
								</div>
							</div>
						</div>
						<div className="rounded-lg border border-gray-200 bg-white p-3">
							<div className="mb-3">
								<span className="text-sm font-medium text-gray-700">Size</span>
							</div>
							<div className="grid grid-cols-4 gap-2">
								{SIZE_OPTIONS.map((option) => (
									<button
										className={clsx(
											'flex flex-col items-center justify-center gap-1.5 rounded-lg p-2.5 transition-all duration-200',
											currentSize === option
												? 'bg-indigo-500 text-white shadow-lg'
												: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
										)}
										key={option}
										onClick={() => setCurrentSize(option)}
										type="button"
									>
										<div
											className={clsx(
												'rounded-full',
												currentSize === option ? 'bg-white' : tool === 'eraser' ? 'bg-gray-400' : 'bg-indigo-600',
											)}
											style={{
												width: Math.max(option / 2, 4),
												height: Math.max(option / 2, 4),
											}}
										/>
										<span className="text-xs font-medium">{option}px</span>
									</button>
								))}
							</div>
						</div>
						<div className="rounded-lg border border-gray-200 bg-white p-3">
							<div className="mb-3">
								<span className="text-sm font-medium text-gray-700">Actions</span>
							</div>
							<div className="flex items-center gap-2">
								<button
									aria-label="Undo"
									className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-all duration-200 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
									disabled={historyStep <= 0}
									onClick={handleUndo}
									type="button"
								>
									<Undo size={18} />
								</button>
								<button
									aria-label="Redo"
									className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-all duration-200 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
									disabled={historyStep >= history.length - 1}
									onClick={handleRedo}
									type="button"
								>
									<Redo size={18} />
								</button>
								<button
									aria-label="Clear canvas"
									className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 transition-all duration-200 hover:bg-red-200"
									onClick={handleClearCanvas}
									type="button"
								>
									<Trash2 size={18} />
								</button>
							</div>
						</div>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);

	return (
		<div className="relative h-screen w-screen bg-slate-50">
			<nav className="fixed top-0 right-0 left-0 z-50 flex items-center justify-between border-b border-gray-200 bg-white/95 px-6 py-3 backdrop-blur-sm">
				<div className="flex items-center gap-2">
					<img alt="PaintIt logo" className="h-8 w-8" src="/icon.png" />
					<h1 className="text-xl font-semibold text-gray-800">PaintIt</h1>
				</div>
				<div className="flex items-center">
					<Button className="gap-2 rounded-r-none border-r-0" onClick={handleExportPNG} size="sm" variant="outline">
						<Download size={16} />
						Export Image
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button className="rounded-l-none px-2" size="sm" variant="outline">
								<ChevronDown size={14} />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-48">
							<DropdownMenuItem className="flex cursor-pointer items-center gap-2" onClick={handleExportPNG}>
								<Image size={16} />
								<span>Save PNG</span>
								<div className="ml-auto flex gap-1">
									<kbd className="bg-muted text-muted-foreground pointer-events-none inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none">
										⌘
									</kbd>
									<kbd className="bg-muted text-muted-foreground pointer-events-none inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none">
										S
									</kbd>
								</div>
							</DropdownMenuItem>
							<DropdownMenuItem className="flex cursor-pointer items-center gap-2" onClick={handleCopyToClipboard}>
								<Copy size={16} />
								<span>Copy Image</span>
								<div className="ml-auto flex gap-1">
									<kbd className="bg-muted text-muted-foreground pointer-events-none inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none">
										⌘
									</kbd>
									<kbd className="bg-muted text-muted-foreground pointer-events-none inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none">
										C
									</kbd>
								</div>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</nav>
			<div className="pt-16">
				<div className="relative h-full w-full" style={{ touchAction: 'none' }}>
					<Stage
						height={window.innerHeight - 64}
						onMouseDown={handleMouseDown}
						onMousemove={handleMouseMove}
						onMouseup={handleMouseUp}
						onTouchEnd={(event) => {
							event.evt.preventDefault();
							handleMouseUp();
						}}
						onTouchMove={(event) => {
							event.evt.preventDefault();
							handleMouseMove(event);
						}}
						onTouchStart={(event) => {
							event.evt.preventDefault();
							handleMouseDown(event);
						}}
						ref={stageRef}
						style={{ touchAction: 'none' }}
						width={window.innerWidth}
					>
						<Layer>
							{lines.map((line, idx) => (
								<Line key={idx} {...getLineProps(line)} />
							))}
						</Layer>
					</Stage>
				</div>
			</div>
			{showToolbox && !isMobile && renderDesktopToolbar()}
			{isMobile && (
				<>
					{renderMobileFloatingMenu()}
					{renderMobileSettingsSheet()}
				</>
			)}
		</div>
	);
};

export default App;
