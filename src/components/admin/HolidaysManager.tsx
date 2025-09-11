import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Modal } from '../ui';
import { FirestoreService } from '../../services/firestore';
import { Holiday, ProductType } from '../../types';
import { PRODUCT_TYPES } from '../../utils/constants';
import { formatDate } from '../../utils/formatters';
import { 
  PlusIcon, 
  TrashIcon,
  CalendarDaysIcon 
} from '@heroicons/react/24/outline';
import { addDoc, collection, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

export function HolidaysManager() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadHolidays();
  }, [selectedYear]);

  const loadHolidays = async () => {
    try {
      setLoading(true);
      const holidaysList = await FirestoreService.getHolidays(selectedYear);
      setHolidays(holidaysList);
    } catch (error) {
      console.error('Error loading holidays:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHoliday = async (holidayData: {
    name: string;
    date: Date;
    type: 'official' | 'corporate';
    productTypes?: ProductType[];
  }) => {
    try {
      await addDoc(collection(db, 'holidays'), {
        ...holidayData,
        date: Timestamp.fromDate(holidayData.date),
        createdAt: Timestamp.now()
      });
      
      await loadHolidays();
      setShowForm(false);
    } catch (error) {
      console.error('Error adding holiday:', error);
    }
  };

  const handleDeleteHoliday = async (holidayId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este feriado?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'holidays', holidayId));
      await loadHolidays();
    } catch (error) {
      console.error('Error deleting holiday:', error);
    }
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() + i;
    return { value: year.toString(), label: year.toString() };
  });

  // Default Mexican holidays for the year
  const defaultHolidays = [
    { name: 'Año Nuevo', date: `${selectedYear}-01-01` },
    { name: 'Día de la Constitución', date: `${selectedYear}-02-05` },
    { name: 'Natalicio de Benito Juárez', date: `${selectedYear}-03-21` },
    { name: 'Día del Trabajo', date: `${selectedYear}-05-01` },
    { name: 'Día de la Independencia', date: `${selectedYear}-09-16` },
    { name: 'Revolución Mexicana', date: `${selectedYear}-11-20` },
    { name: 'Navidad', date: `${selectedYear}-12-25` }
  ];

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select
            label="Año"
            value={selectedYear.toString()}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            options={yearOptions}
          />
        </div>
        
        <Button
          onClick={() => setShowForm(true)}
          leftIcon={<PlusIcon className="h-4 w-4" />}
        >
          Añadir Feriado
        </Button>
      </div>

      {/* Holidays List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Días Feriados {selectedYear}
          </h3>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : holidays.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No hay feriados configurados
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Comienza añadiendo los feriados oficiales de México.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {holidays.map((holiday) => (
              <div key={holiday.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {holiday.name}
                  </h4>
                  <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                    <span>{formatDate(holiday.date)}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      holiday.type === 'official' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {holiday.type === 'official' ? 'Oficial' : 'Corporativo'}
                    </span>
                    {holiday.productTypes && (
                      <span className="text-xs">
                        Solo: {holiday.productTypes.map(pt => PRODUCT_TYPES[pt]).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteHoliday(holiday.id)}
                  leftIcon={<TrashIcon className="h-4 w-4" />}
                >
                  Eliminar
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Holiday Modal */}
      {showForm && (
        <HolidayForm
          year={selectedYear}
          onSave={handleAddHoliday}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

// Holiday Form Component
interface HolidayFormProps {
  year: number;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
}

function HolidayForm({ year, onSave, onCancel }: HolidayFormProps) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<'official' | 'corporate'>('official');
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [saving, setSaving] = useState(false);

  const typeOptions = [
    { value: 'official', label: 'Oficial (aplica a todos)' },
    { value: 'corporate', label: 'Corporativo (configurable)' }
  ];

  const productOptions = Object.entries(PRODUCT_TYPES).map(([key, label]) => ({
    value: key,
    label,
    checked: productTypes.includes(key as ProductType)
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !date) return;

    try {
      setSaving(true);
      await onSave({
        name,
        date: new Date(date),
        type,
        productTypes: type === 'corporate' && productTypes.length > 0 ? productTypes : undefined
      });
    } catch (error) {
      console.error('Error saving holiday:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleProductType = (productType: ProductType) => {
    setProductTypes(prev => 
      prev.includes(productType)
        ? prev.filter(pt => pt !== productType)
        : [...prev, productType]
    );
  };

  return (
    <Modal isOpen={true} onClose={onCancel} title="Añadir Nuevo Día Feriado">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nombre del Feriado"
          placeholder="Ej: Aniversario de la Ciudad"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input
          label="Fecha"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={`${year}-01-01`}
          max={`${year}-12-31`}
          required
        />

        <Select
          label="Tipo"
          value={type}
          onChange={(e) => setType(e.target.value as any)}
          options={typeOptions}
        />

        {type === 'corporate' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aplicar solo a productos específicos (opcional)
            </label>
            <div className="space-y-2">
              {productOptions.map((option) => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={option.checked}
                    onChange={() => toggleProductType(option.value as ProductType)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Si no seleccionas ninguno, aplicará a todos los productos
            </p>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            Añadir Feriado
          </Button>
        </div>
      </form>
    </Modal>
  );
}