import React, { useState, useEffect } from 'react';
import { Modal, Button, Alert, Input } from '../ui';
import { FirestoreService } from '../../services/firestore';
import { User, SalesGoal } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { ChartBarIcon } from '@heroicons/react/24/outline';

interface SalesGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

function getCurrentPeriod(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function periodLabel(period: string): string {
  const [year, month] = period.split('-');
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
}

function generatePeriodOptions(): string[] {
  const options: string[] = [];
  const now = new Date();
  // current month + 2 months forward + 3 months back
  for (let i = -3; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    options.push(`${y}-${m}`);
  }
  return options;
}

export function SalesGoalModal({ isOpen, onClose, user }: SalesGoalModalProps) {
  const { user: currentUser } = useAuth();
  const [period, setPeriod] = useState(getCurrentPeriod);
  const [goalInput, setGoalInput] = useState('');
  const [existing, setExisting] = useState<SalesGoal | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const periodOptions = generatePeriodOptions();

  useEffect(() => {
    if (!isOpen || !user) return;
    setError(null);
    setSuccess(null);
    loadExisting();
  }, [isOpen, user, period]);

  const loadExisting = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const goal = await FirestoreService.getSalesGoal(user.id, period);
      setExisting(goal);
      setGoalInput(goal ? String(goal.goal) : '');
    } catch (err) {
      console.error('Error loading sales goal:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !currentUser) return;

    const parsed = parseFloat(goalInput.replace(/,/g, ''));
    if (isNaN(parsed) || parsed < 0) {
      setError('Ingresa un número válido mayor o igual a 0');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await FirestoreService.setSalesGoal(
        user.id,
        user.name,
        period,
        parsed,
        currentUser?.id || 'unknown'
      );
      setSuccess(`Meta de ${periodLabel(period)} guardada: ${parsed.toLocaleString('es-MX')}`);
      await loadExisting();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving sales goal:', err);
      setError('Error al guardar la meta. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !existing) return;
    if (!confirm(`¿Eliminar la meta de ${periodLabel(period)} para ${user.name}?`)) return;
    try {
      setSaving(true);
      setError(null);
      await FirestoreService.deleteSalesGoal(user.id, period);
      setExisting(null);
      setGoalInput('');
      setSuccess('Meta eliminada correctamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Error al eliminar la meta');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setPeriod(getCurrentPeriod());
    setGoalInput('');
    setExisting(null);
    setError(null);
    setSuccess(null);
    onClose();
  };

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Meta de Ventas" size="md">
      <div className="space-y-5">

        {/* User info */}
        <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-primary-700">
              {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <ChartBarIcon className="h-5 w-5 text-gray-400 ml-auto" />
        </div>

        {/* Period selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {periodOptions.map(p => (
              <option key={p} value={p}>
                {periodLabel(p)}{p === getCurrentPeriod() ? ' (mes actual)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Goal input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meta de ventas {loading ? '(cargando...)' : existing ? '— editar existente' : '— nueva'}
          </label>
          <Input
            type="number"
            placeholder="Ej: 50000"
            value={goalInput}
            onChange={e => setGoalInput(e.target.value)}
            disabled={loading}
            helpText="Número de ventas, créditos o monto objetivo para el período seleccionado"
          />
        </div>

        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        {/* Actions */}
        <div className="flex justify-between items-center pt-1">
          <div>
            {existing && (
              <Button
                variant="danger"
                onClick={handleDelete}
                loading={saving}
                disabled={saving || loading}
              >
                Eliminar meta
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              loading={saving}
              disabled={saving || loading || goalInput.trim() === ''}
            >
              {existing ? 'Actualizar meta' : 'Guardar meta'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
