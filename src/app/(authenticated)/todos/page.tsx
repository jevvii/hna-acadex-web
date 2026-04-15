'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, CheckCircle2, Circle, AlertCircle, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { todoApi } from '@/lib/api';
import { TodoItem } from '@/lib/types';

const filterTabs = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'completed', label: 'Completed' },
];

const priorityColors: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

function formatDueDate(dateStr?: string): string {
  if (!dateStr) return 'No due date';
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function toPlainText(value?: string): string {
  if (!value) return '';
  if (!value.includes('<')) return value.trim();
  if (typeof window === 'undefined') {
    return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const doc = new DOMParser().parseFromString(value, 'text/html');
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
}

export default function TodosPage() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState('pending');
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Fetch todos
  const { data: todos, isLoading, error } = useQuery({
    queryKey: ['todos'],
    queryFn: () => todoApi.getTodos(),
  });

  // Toggle todo mutation
  const toggleMutation = useMutation({
    mutationFn: ({ id, is_done }: { id: string; is_done: boolean }) =>
      todoApi.updateTodo(id, { is_done }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  // Delete todo mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => todoApi.deleteTodo(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });

  // Create todo mutation
  const createMutation = useMutation({
    mutationFn: (todo: Partial<TodoItem>) => todoApi.createTodo(todo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      setNewTaskTitle('');
    },
  });

  // Normalize todos to array (handle paginated response { results: [...] })
  const todoList: TodoItem[] = Array.isArray(todos)
    ? todos
    : (todos as unknown as { results?: TodoItem[] })?.results ?? [];

  const filteredTodos = todoList
    .filter((todo: TodoItem) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'pending') return !todo.is_done;
      if (activeFilter === 'completed') return todo.is_done;
      return true;
    })
    .sort((a: TodoItem, b: TodoItem) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return bTime - aTime;
    });

  const toggleTodo = (id: string, currentStatus: boolean) => {
    toggleMutation.mutate({ id, is_done: !currentStatus });
  };

  const deleteTodo = (id: string) => {
    deleteMutation.mutate(id);
  };

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    createMutation.mutate({
      title: newTaskTitle,
      description: '',
      due_at: new Date().toISOString(),
      is_done: false,
    });
  };

  const isOverdue = (todo: TodoItem): boolean => {
    if (todo.is_done || !todo.due_at) return false;
    return new Date(todo.due_at) < new Date();
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-navy-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl">
        <p className="text-red-500">Failed to load todos. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="font-display text-3xl font-bold text-navy-800">To-Do List</h1>
        <p className="text-gray-500 mt-1">Manage your tasks and assignments</p>
      </motion.div>

      {/* Add Task Input */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={addTodo}
        className="bg-white rounded-xl shadow-card p-4 mb-6"
      >
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-navy-100 flex items-center justify-center flex-shrink-0">
            <Plus className="w-5 h-5 text-navy-600" />
          </div>
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1 bg-transparent outline-none text-navy-800 placeholder:text-gray-400"
            disabled={createMutation.isPending}
          />
          <button
            type="submit"
            disabled={createMutation.isPending || !newTaskTitle.trim()}
            className="px-4 py-2 bg-navy-600 text-white rounded-lg font-medium hover:bg-navy-700 transition-colors disabled:opacity-50"
          >
            {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add'}
          </button>
        </div>
      </motion.form>

      {/* Filter Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex gap-2 mb-6"
      >
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-colors',
              activeFilter === tab.id
                ? 'bg-navy-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            )}
          >
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Todo List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <AnimatePresence mode="popLayout">
          {filteredTodos?.map((todo: TodoItem, index: number) => (
            <motion.div
              key={todo.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'bg-white rounded-xl shadow-card p-4 flex items-start gap-4 group',
                todo.is_done && 'opacity-60'
              )}
            >
              <button
                onClick={() => toggleTodo(todo.id, todo.is_done)}
                disabled={toggleMutation.isPending}
                className="mt-0.5 text-gray-400 hover:text-navy-600 transition-colors"
              >
                {todo.is_done ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <Circle className="w-6 h-6" />
                )}
              </button>

              <div className="flex-1">
                <h3 className={cn(
                  'font-medium text-navy-800',
                  todo.is_done && 'line-through text-gray-500'
                )}>
                  {todo.title}
                </h3>
                {(() => {
                  const descriptionText = toPlainText(todo.description);
                  if (!descriptionText) return null;
                  return <p className="text-sm text-gray-500 mt-0.5">{descriptionText}</p>;
                })()}
                <div className="flex items-center gap-3 mt-2">
                  <span className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full',
                    isOverdue(todo) ? 'bg-red-100 text-red-700' : 'text-gray-500'
                  )}>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {isOverdue(todo) ? 'Overdue' : formatDueDate(todo.due_at)}
                    </span>
                  </span>
                  {todo.activity_id && (
                    <span className="text-xs text-navy-600 bg-navy-50 px-2 py-0.5 rounded-full">Assignment</span>
                  )}
                  {todo.quiz_id && (
                    <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Quiz</span>
                  )}
                </div>
              </div>

              <button
                onClick={() => deleteTodo(todo.id)}
                disabled={deleteMutation.isPending}
                className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredTodos?.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No {activeFilter} tasks</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
