// src/components/admin/ReportFilters.tsx - Advanced filters for reports
import React, { useState, useEffect } from 'react';
import { User, Kiosk, Hub } from '../../types';
import { ReportFilters } from '../../services/reportsService';
import { getAllUsers, getAllKiosks, getAllHubs } from '../../services/reportsService';
import { FunnelIcon, XMarkIcon, ChevronDownIcon, ChevronUpIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui/Button';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

interface ReportFiltersProps {
  onFilterChange: (filters: ReportFilters) => void;
  initialFilters?: Partial<ReportFilters>;
  autoApply?: boolean;
}

export default function ReportFiltersComponent({ onFilterChange, initialFilters, autoApply = false }: ReportFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [supervisors, setSupervisors] = useState<User[]>([]);

  // Filter state
  const [startDate, setStartDate] = useState<string>(
    initialFilters?.startDate?.toISOString().split('T')[0] ||
    new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    initialFilters?.endDate?.toISOString().split('T')[0] ||
    new Date().toISOString().split('T')[0]
  );
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(initialFilters?.userIds || []);
  const [selectedKioskIds, setSelectedKioskIds] = useState<string[]>(initialFilters?.kioskIds || []);
  const [selectedHubIds, setSelectedHubIds] = useState<string[]>(initialFilters?.hubIds || []);
  const [selectedProductTypes, setSelectedProductTypes] = useState<string[]>(initialFilters?.productTypes || []);
  const [selectedSupervisorIds, setSelectedSupervisorIds] = useState<string[]>(initialFilters?.supervisorIds || []);
  const [selectedCheckInType, setSelectedCheckInType] = useState<string>(initialFilters?.checkInType || '');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialFilters?.status || '');

  // Load options
  useEffect(() => {
    loadOptions();
  }, []);

  // Auto-apply on mount
  useEffect(() => {
    if (autoApply) {
      handleApplyFilters();
    }
  }, [autoApply]);

  const loadOptions = async () => {
    try {
      const [usersData, kiosksData, hubsData] = await Promise.all([
        getAllUsers(),
        getAllKiosks(),
        getAllHubs()
      ]);

      const allUsers = usersData;
      setUsers(allUsers.filter(u => u.status === 'active'));
      setSupervisors(allUsers.filter(u => u.role === 'supervisor' || u.role === 'admin' || u.role === 'super_admin'));
      setKiosks(kiosksData);
      setHubs(hubsData);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const handleApplyFilters = () => {
    // Parse dates in LOCAL timezone (not UTC!)
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

    const filters: ReportFilters = {
      startDate: new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0), // Start of day in local time
      endDate: new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999), // End of day in local time
      userIds: selectedUserIds.length > 0 ? selectedUserIds : undefined,
      kioskIds: selectedKioskIds.length > 0 ? selectedKioskIds : undefined,
      hubIds: selectedHubIds.length > 0 ? selectedHubIds : undefined,
      productTypes: selectedProductTypes.length > 0 ? selectedProductTypes : undefined,
      supervisorIds: selectedSupervisorIds.length > 0 ? selectedSupervisorIds : undefined,
      checkInType: selectedCheckInType as any || undefined,
      status: selectedStatus as any || undefined,
    };

    console.log('🔍 Applying filters:', filters);
    console.log('📅 Start date (local):', filters.startDate.toLocaleString('es-MX'));
    console.log('📅 End date (local):', filters.endDate.toLocaleString('es-MX'));
    onFilterChange(filters);
  };

  const handleClearFilters = () => {
    const today = new Date();
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
    setStartDate(firstDayOfYear.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    setSelectedUserIds([]);
    setSelectedKioskIds([]);
    setSelectedHubIds([]);
    setSelectedProductTypes([]);
    setSelectedSupervisorIds([]);
    setSelectedCheckInType('');
    setSelectedStatus('');

    onFilterChange({
      startDate: new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0), // Jan 1 at midnight local
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999), // Today at 23:59:59 local
    });
  };

  const handleDiagnostic = async () => {
    try {
      console.log('🔍 Iniciando diagnóstico de base de datos...');
      // IMPORTANTE: La colección se llama 'checkins' (minúsculas)
      const snapshot = await getDocs(collection(db, 'checkins'));
      const totalCheckIns = snapshot.docs.length;

      console.log(`📊 DIAGNÓSTICO: Se encontraron ${totalCheckIns} check-ins en total`);

      if (totalCheckIns > 0) {
        // Mostrar algunas fechas de ejemplo
        const dates = snapshot.docs.slice(0, 5).map(doc => {
          const data = doc.data();
          const timestamp = data.timestamp?.toDate?.() || new Date();
          return timestamp.toLocaleDateString('es-MX');
        });
        console.log('📅 Fechas de ejemplo:', dates);

        alert(`✅ Base de datos OK!\n\nTotal de check-ins: ${totalCheckIns}\n\nEjemplos de fechas:\n${dates.join('\n')}\n\n💡 Si no ves datos, ajusta el rango de fechas para incluir estas fechas.`);
      } else {
        alert('❌ No hay check-ins registrados en la base de datos.\n\nPara ver reportes, primero registra algunos check-ins desde /employee/checkin');
      }
    } catch (error) {
      console.error('❌ Error en diagnóstico:', error);
      alert(`❌ Error al diagnosticar: ${error}\n\nRevisa la consola para más detalles.`);
    }
  };

  const activeFiltersCount = [
    selectedUserIds.length > 0,
    selectedKioskIds.length > 0,
    selectedHubIds.length > 0,
    selectedProductTypes.length > 0,
    selectedSupervisorIds.length > 0,
    selectedCheckInType !== '',
    selectedStatus !== '',
  ].filter(Boolean).length;

  const productTypes = [
    { value: 'BA', label: 'BA', color: 'blue' },
    { value: 'Aviva_Contigo', label: 'Aviva Contigo', color: 'purple' },
    { value: 'Casa_Marchand', label: 'Casa Marchand', color: 'green' },
    { value: 'Otro', label: 'Otro', color: 'gray' }
  ];

  const checkInTypes = [
    { value: 'entrada', label: 'Entrada', icon: '🚪' },
    { value: 'comida', label: 'Comida', icon: '🍽️' },
    { value: 'regreso_comida', label: 'Regreso Comida', icon: '↩️' },
    { value: 'salida', label: 'Salida', icon: '🏃' }
  ];

  const statusOptions = [
    { value: 'a_tiempo', label: 'A Tiempo', color: 'green' },
    { value: 'retrasado', label: 'Retrasado', color: 'red' },
    { value: 'anticipado', label: 'Anticipado', color: 'yellow' },
    { value: 'ubicacion_invalida', label: 'Ubicación Inválida', color: 'orange' }
  ];

  const toggleProductType = (type: string) => {
    if (selectedProductTypes.includes(type)) {
      setSelectedProductTypes(selectedProductTypes.filter(t => t !== type));
    } else {
      setSelectedProductTypes([...selectedProductTypes, type]);
    }
  };

  const toggleHub = (hubId: string) => {
    if (selectedHubIds.includes(hubId)) {
      setSelectedHubIds(selectedHubIds.filter(id => id !== hubId));
    } else {
      setSelectedHubIds([...selectedHubIds, hubId]);
    }
  };

  const toggleKiosk = (kioskId: string) => {
    if (selectedKioskIds.includes(kioskId)) {
      setSelectedKioskIds(selectedKioskIds.filter(id => id !== kioskId));
    } else {
      setSelectedKioskIds([...selectedKioskIds, kioskId]);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FunnelIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Filtros de Reporte</h3>
            <p className="text-sm text-gray-500">Personaliza tu análisis de datos</p>
          </div>
          {activeFiltersCount > 0 && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">
              {activeFiltersCount} filtros activos
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 text-sm font-medium text-blue-600 hover:text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <span>{isExpanded ? 'Ocultar filtros' : 'Mostrar más filtros'}</span>
          {isExpanded ? (
            <ChevronUpIcon className="h-5 w-5" />
          ) : (
            <ChevronDownIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Date Range - Always Visible */}
      <div className="mb-6">
        <label className="block text-sm font-bold text-gray-700 mb-3">
          📅 Rango de Fechas
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Desde
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Hasta
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm font-medium"
            />
          </div>
        </div>

        {/* Quick Date Presets */}
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            onClick={() => {
              const today = new Date();
              setStartDate(today.toISOString().split('T')[0]);
              setEndDate(today.toISOString().split('T')[0]);
            }}
            className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
          >
            📅 Hoy
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const lastWeek = new Date(today);
              lastWeek.setDate(today.getDate() - 7);
              setStartDate(lastWeek.toISOString().split('T')[0]);
              setEndDate(today.toISOString().split('T')[0]);
            }}
            className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
          >
            📊 Última Semana
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
              setStartDate(firstDay.toISOString().split('T')[0]);
              setEndDate(today.toISOString().split('T')[0]);
            }}
            className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors border border-blue-200"
          >
            📆 Este Mes
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const threeMonthsAgo = new Date(today);
              threeMonthsAgo.setMonth(today.getMonth() - 3);
              setStartDate(threeMonthsAgo.toISOString().split('T')[0]);
              setEndDate(today.toISOString().split('T')[0]);
            }}
            className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors border border-purple-200"
          >
            📈 Últimos 3 Meses
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
              setStartDate(firstDayOfYear.toISOString().split('T')[0]);
              setEndDate(today.toISOString().split('T')[0]);
            }}
            className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors border border-green-200"
          >
            📊 Todo el Año {new Date().getFullYear()}
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="space-y-6 border-t pt-6">
          {/* Product Types */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              🏢 Tipos de Producto {selectedProductTypes.length > 0 && `(${selectedProductTypes.length})`}
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {productTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => toggleProductType(type.value)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedProductTypes.includes(type.value)
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div className={`text-lg font-bold ${
                      selectedProductTypes.includes(type.value) ? 'text-blue-600' : 'text-gray-600'
                    }`}>
                      {type.label}
                    </div>
                    {selectedProductTypes.includes(type.value) && (
                      <div className="mt-1 text-xs text-blue-600 font-medium">✓ Seleccionado</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Hubs */}
          {hubs.length > 0 && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                🏭 Hubs {selectedHubIds.length > 0 && `(${selectedHubIds.length})`}
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {hubs.map((hub) => (
                  <button
                    key={hub.id}
                    onClick={() => toggleHub(hub.id)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      selectedHubIds.includes(hub.id)
                        ? 'border-green-500 bg-green-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className={`font-medium text-sm ${
                      selectedHubIds.includes(hub.id) ? 'text-green-700' : 'text-gray-700'
                    }`}>
                      {hub.name}
                    </div>
                    {selectedHubIds.includes(hub.id) && (
                      <div className="mt-1 text-xs text-green-600 font-medium">✓ Seleccionado</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Kiosks/Stores */}
          {kiosks.length > 0 && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                🏪 Tiendas/Kioscos {selectedKioskIds.length > 0 && `(${selectedKioskIds.length})`}
              </label>
              <div className="max-h-48 overflow-y-auto border-2 border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {kiosks.map((kiosk) => (
                    <label
                      key={kiosk.id}
                      className={`flex items-center p-3 rounded-lg cursor-pointer transition-all ${
                        selectedKioskIds.includes(kiosk.id)
                          ? 'bg-purple-100 border-2 border-purple-500'
                          : 'bg-white border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedKioskIds.includes(kiosk.id)}
                        onChange={() => toggleKiosk(kiosk.id)}
                        className="w-5 h-5 text-purple-600 focus:ring-purple-500 rounded"
                      />
                      <span className={`ml-3 text-sm font-medium ${
                        selectedKioskIds.includes(kiosk.id) ? 'text-purple-700' : 'text-gray-700'
                      }`}>
                        {kiosk.name} - {kiosk.city}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Check-in Type */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              🕐 Tipo de Check-in
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {checkInTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSelectedCheckInType(selectedCheckInType === type.value ? '' : type.value)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedCheckInType === type.value
                      ? 'border-orange-500 bg-orange-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">{type.icon}</div>
                    <div className={`text-sm font-medium ${
                      selectedCheckInType === type.value ? 'text-orange-700' : 'text-gray-700'
                    }`}>
                      {type.label}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              ⚡ Estado
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {statusOptions.map((status) => (
                <button
                  key={status.value}
                  onClick={() => setSelectedStatus(selectedStatus === status.value ? '' : status.value)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedStatus === status.value
                      ? `border-${status.color}-500 bg-${status.color}-50 shadow-md`
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className={`text-sm font-medium text-center ${
                    selectedStatus === status.value ? `text-${status.color}-700` : 'text-gray-700'
                  }`}>
                    {status.label}
                  </div>
                  {selectedStatus === status.value && (
                    <div className={`mt-1 text-xs text-${status.color}-600 font-medium text-center`}>✓</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between mt-6 pt-6 border-t">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleClearFilters}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
            <span>Limpiar Todo</span>
          </button>
          <button
            onClick={handleDiagnostic}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-orange-700 hover:text-orange-900 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors border border-orange-200"
            title="Ver cuántos check-ins hay en la base de datos"
          >
            <WrenchScrewdriverIcon className="h-5 w-5" />
            <span>Diagnóstico</span>
          </button>
        </div>
        <Button onClick={handleApplyFilters} size="lg">
          <FunnelIcon className="h-5 w-5 mr-2" />
          Generar Reporte
        </Button>
      </div>
    </div>
  );
}
