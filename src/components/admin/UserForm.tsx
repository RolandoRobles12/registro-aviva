import React, { useEffect, useState } from 'react';
import { useForm } from '../../hooks';
import { Button, Input, Select, Alert } from '../ui';
import { userSchema } from '../../utils/validators';
import { USER_ROLES, PRODUCT_TYPES } from '../../utils/constants';
import { User, UserRole, ProductType, Hub, Kiosk } from '../../types';
import { HubService } from '../../services/hubs';
import { FirestoreService } from '../../services/firestore';

interface UserFormProps {
  user?: User | null;
  onSave: (data: Partial<User>) => Promise<void>;
  onCancel: () => void;
}

export function UserForm({ user, onSave, onCancel }: UserFormProps) {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [kiosks, setKiosks] = useState<Kiosk[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const {
    values,
    errors,
    handleSubmit,
    setValue,
    isSubmitting
  } = useForm<Partial<User>>(
    user || {
      name: '',
      email: '',
      role: 'promotor',
      team: '',
      slackId: '',
      status: 'active',
      hubId: '',
      assignedKiosk: '',
      assignedKioskName: ''
    },
    (values) => {
      try {
        if (values.name && values.email && values.role) {
          userSchema.parse(values);
        }
        return {};
      } catch (error: any) {
        const fieldErrors: Partial<Record<keyof User, string>> = {};
        error.errors?.forEach((err: any) => {
          if (err.path?.length > 0) {
            fieldErrors[err.path[0] as keyof User] = err.message;
          }
        });
        return fieldErrors;
      }
    }
  );

  useEffect(() => {
    const loadOptions = async () => {
      try {
        setLoadingOptions(true);
        const [hubList, kioskList] = await Promise.all([
          HubService.getAllHubs(true),
          FirestoreService.getActiveKiosks()
        ]);
        setHubs(hubList);
        setKiosks(kioskList);
      } catch (error) {
        console.error('Error loading hubs/kiosks for form:', error);
      } finally {
        setLoadingOptions(false);
      }
    };
    loadOptions();
  }, []);

  const roleOptions = Object.entries(USER_ROLES).map(([key, label]) => ({
    value: key,
    label
  }));

  const statusOptions = [
    { value: 'active', label: 'Activo' },
    { value: 'inactive', label: 'Inactivo' }
  ];

  const productTypeOptions = [
    { value: '', label: 'Sin asignar' },
    ...Object.entries(PRODUCT_TYPES).map(([key, label]) => ({
      value: key,
      label
    }))
  ];

  const hubOptions = [
    { value: '', label: 'Sin asignar' },
    ...hubs.map(h => ({ value: h.id, label: h.name }))
  ];

  const kioskOptions = [
    { value: '', label: 'Sin asignar' },
    ...kiosks.map(k => ({ value: k.id, label: `${k.name} — ${k.city}, ${k.state}` }))
  ];

  const handleKioskChange = (kioskId: string) => {
    if (!kioskId) {
      setValue('assignedKiosk', undefined);
      setValue('assignedKioskName', undefined);
      return;
    }
    const kiosk = kiosks.find(k => k.id === kioskId);
    setValue('assignedKiosk', kioskId);
    setValue('assignedKioskName', kiosk?.name || kioskId);
    // Auto-assign hub from kiosk if kiosk has a hub and user hasn't manually picked one
    if (kiosk?.hubId && !values.hubId) {
      setValue('hubId', kiosk.hubId);
    }
  };

  const handleFormSubmit = handleSubmit(async (formData) => {
    // Normalize empty strings to undefined so Firestore doesn't store empty fields
    const cleaned: Partial<User> = { ...formData };
    if (!cleaned.hubId) delete cleaned.hubId;
    if (!cleaned.assignedKiosk) {
      delete cleaned.assignedKiosk;
      delete cleaned.assignedKioskName;
    }
    await onSave(cleaned);
  });

  const isEditing = !!user;

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {/* Information Alert */}
      {!isEditing && (
        <Alert
          type="info"
          title="Invitar Nuevo Usuario"
          message="El usuario será creado automáticamente cuando inicie sesión por primera vez con su correo corporativo de Aviva."
        />
      )}

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Nombre Completo"
          placeholder="Juan Pérez"
          value={values.name || ''}
          onChange={(e) => setValue('name', e.target.value)}
          error={errors.name}
          required
        />

        <Input
          label="Correo Electrónico"
          type="email"
          placeholder="juan.perez@avivacredito.com"
          value={values.email || ''}
          onChange={(e) => setValue('email', e.target.value)}
          error={errors.email}
          helpText="Debe ser un correo corporativo @avivacredito.com"
          disabled={isEditing}
          required
        />
      </div>

      {/* Role and Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Rol"
          value={values.role || ''}
          onChange={(e) => setValue('role', e.target.value as UserRole)}
          options={roleOptions}
          error={errors.role}
          required
        />

        <Select
          label="Estado"
          value={values.status || ''}
          onChange={(e) => setValue('status', e.target.value as any)}
          options={statusOptions}
          error={errors.status}
          required
        />
      </div>

      {/* Product Type */}
      <div className="grid grid-cols-1 gap-4">
        <Select
          label="Tipo de Producto"
          value={values.productType || ''}
          onChange={(e) => setValue('productType', (e.target.value || undefined) as ProductType)}
          options={productTypeOptions}
          error={errors.productType}
          helpText="Requerido para detección de faltas automática. Asigna el producto/departamento del usuario."
        />
      </div>

      {/* Hub and Kiosk */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Hub"
          value={values.hubId || ''}
          onChange={(e) => setValue('hubId', e.target.value || undefined)}
          options={loadingOptions ? [{ value: '', label: 'Cargando hubs...' }] : hubOptions}
          disabled={loadingOptions}
          helpText="Grupo geográfico al que pertenece el usuario. Requerido para el reporte por Hub."
        />

        <Select
          label="Kiosco Asignado"
          value={values.assignedKiosk || ''}
          onChange={(e) => handleKioskChange(e.target.value)}
          options={loadingOptions ? [{ value: '', label: 'Cargando kioscos...' }] : kioskOptions}
          disabled={loadingOptions}
          helpText="Al seleccionar un kiosco se asigna su Hub automáticamente si no hay uno elegido."
        />
      </div>

      {/* Team and Slack ID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Equipo"
          placeholder="Promotores CDMX"
          value={values.team || ''}
          onChange={(e) => setValue('team', e.target.value)}
          error={errors.team}
          helpText="Opcional: Nombre del equipo al que pertenece"
        />

        <Input
          label="Slack ID"
          placeholder="U01A1B2C3D4"
          value={values.slackId || ''}
          onChange={(e) => setValue('slackId', e.target.value)}
          error={errors.slackId}
          helpText="Opcional: ID de usuario en Slack para notificaciones"
        />
      </div>

      {/* Role Descriptions */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          Descripción de Roles
        </h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li><strong>Super Administrador:</strong> Acceso total al sistema, incluyendo configuraciones avanzadas</li>
          <li><strong>Administrador:</strong> Gestión de usuarios, kioscos, aprobación de solicitudes y reportes</li>
          <li><strong>Supervisor:</strong> Visualización de reportes y aprobación de solicitudes de su equipo</li>
          <li><strong>Promotor:</strong> Solo puede registrar check-ins y solicitar días libres</li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          loading={isSubmitting}
        >
          {isEditing ? 'Actualizar Usuario' : 'Invitar Usuario'}
        </Button>
      </div>
    </form>
  );
}
