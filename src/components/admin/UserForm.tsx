import React from 'react';
import { useForm } from '../../hooks';
import { Button, Input, Select, Alert } from '../ui';
import { userSchema } from '../../utils/validators';
import { USER_ROLES, PRODUCT_TYPES } from '../../utils/constants';
import { User, UserRole, ProductType } from '../../types';

interface UserFormProps {
  user?: User | null;
  onSave: (data: Partial<User>) => Promise<void>;
  onCancel: () => void;
}

export function UserForm({ user, onSave, onCancel }: UserFormProps) {
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
      status: 'active'
    },
    (values) => {
      try {
        // Only validate if we have the required fields
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

  const handleFormSubmit = handleSubmit(async (formData) => {
    await onSave(formData);
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
          disabled={isEditing} // Can't change email for existing users
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