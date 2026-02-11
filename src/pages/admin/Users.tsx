import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UsersTable } from '../../components/admin/UsersTable';
import { UserForm } from '../../components/admin/UserForm';
import { UserFilters } from '../../components/admin/UserFilters';
import { LoadingSpinner, Alert, Button, Modal } from '../../components/ui';
import { User } from '../../types';
import { PlusIcon, UserPlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { assignProductTypesFromCheckIns, getUsersWithoutProduct } from '../../services/userMigration';

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<{ current: number; total: number; userName: string } | null>(null);
  const [usersWithoutProduct, setUsersWithoutProduct] = useState(0);
  const [staleUsersCount, setStaleUsersCount] = useState(0);

  useEffect(() => {
    loadUsers();
    checkUsersWithoutProduct();
  }, []);

  const checkUsersWithoutProduct = async () => {
    try {
      const stats = await getUsersWithoutProduct();
      setUsersWithoutProduct(stats.total);
    } catch (error) {
      console.error('Error checking users without product:', error);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];

      setUsers(usersList);
      setFilteredUsers(usersList);

      // Detectar usuarios activos sin actividad en 60+ días para alertar al admin
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const stale = usersList.filter((u) => {
        if (u.status !== 'active' || ['admin', 'super_admin'].includes(u.role)) return false;
        const lastLogin = (u as any).lastLoginAt;
        if (!lastLogin) return true;
        const lastLoginDate: Date = lastLogin?.toDate ? lastLogin.toDate() : new Date(lastLogin);
        return lastLoginDate < sixtyDaysAgo;
      });
      setStaleUsersCount(stale.length);
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Error cargando usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSave = async (userData: Partial<User>) => {
    try {
      setError(null);
      
      if (editingUser) {
        // Update existing user
        const userRef = doc(db, 'users', editingUser.id);
        await updateDoc(userRef, {
          ...userData,
          updatedAt: new Date()
        });
        setSuccess('Usuario actualizado correctamente');
      } else {
        // For new users, they will be created when they first sign in
        setSuccess('Usuario configurado. Se creará cuando inicie sesión por primera vez.');
      }

      await loadUsers();
      setShowForm(false);
      setEditingUser(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error saving user:', error);
      setError('Error guardando el usuario');
    }
  };

  const handleUserToggle = async (userId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        status: newStatus,
        updatedAt: new Date()
      });

      setSuccess(`Usuario ${newStatus === 'active' ? 'activado' : 'desactivado'} correctamente`);
      await loadUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error toggling user status:', error);
      setError('Error actualizando estado del usuario');
    }
  };

  const handleUserDelete = async (userId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
      
      setSuccess('Usuario eliminado correctamente');
      await loadUsers();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Error eliminando usuario');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleAdd = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingUser(null);
  };

  const handleFiltersChange = (filters: any) => {
    let filtered = [...users];

    if (filters.name) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(filters.name.toLowerCase()) ||
        user.email.toLowerCase().includes(filters.name.toLowerCase())
      );
    }

    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    if (filters.status) {
      filtered = filtered.filter(user => user.status === filters.status);
    }

    if (filters.team) {
      filtered = filtered.filter(user => user.team === filters.team);
    }

    setFilteredUsers(filtered);
  };

  const handleAssignProducts = async () => {
    if (!confirm(
      `¿Deseas asignar automáticamente el tipo de producto a ${usersWithoutProduct} usuarios basándote en su último check-in?\n\n` +
      'Esta acción actualizará los usuarios que no tienen producto asignado.'
    )) {
      return;
    }

    try {
      setMigrating(true);
      setError(null);

      const result = await assignProductTypesFromCheckIns(
        (current, total, userName) => {
          setMigrationProgress({ current, total, userName });
        }
      );

      setMigrationProgress(null);

      if (result.success > 0) {
        setSuccess(
          `✅ Asignación completada:\n` +
          `• ${result.success} usuarios actualizados\n` +
          `• ${result.noCheckIns} usuarios sin check-ins\n` +
          `• ${result.errors} errores`
        );

        // Recargar usuarios
        await loadUsers();
        await checkUsersWithoutProduct();
      } else if (result.total === 0) {
        setSuccess('Todos los usuarios activos ya tienen producto asignado');
      } else {
        setError(
          `No se pudieron asignar productos:\n` +
          `• ${result.noCheckIns} usuarios sin check-ins\n` +
          `• ${result.errors} errores`
        );
      }

      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error assigning products:', error);
      setError('Error asignando productos automáticamente');
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Gestión de Usuarios
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Administra los usuarios del sistema, asigna roles y equipos.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {usersWithoutProduct > 0 && (
              <Button
                variant="secondary"
                onClick={handleAssignProducts}
                leftIcon={<ArrowPathIcon className="h-4 w-4" />}
                loading={migrating}
                disabled={migrating}
              >
                {migrating
                  ? migrationProgress
                    ? `Asignando ${migrationProgress.current}/${migrationProgress.total}...`
                    : 'Asignando productos...'
                  : `Asignar Productos (${usersWithoutProduct})`
                }
              </Button>
            )}
            <Button
              variant="primary"
              onClick={handleAdd}
              leftIcon={<UserPlusIcon className="h-4 w-4" />}
            >
              Invitar Usuario
            </Button>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <Alert
          type="error"
          message={error}
          dismissible
          onDismiss={() => setError(null)}
        />
      )}

      {success && (
        <Alert
          type="success"
          message={success}
          dismissible
          onDismiss={() => setSuccess(null)}
        />
      )}

      {staleUsersCount > 0 && (
        <Alert
          type="warning"
          message={`${staleUsersCount} colaborador(es) activo(s) llevan más de 60 días sin iniciar sesión. Verifica si aún trabajan en la empresa y márcalos como inactivos si ya no son colaboradores.`}
          dismissible
          onDismiss={() => setStaleUsersCount(0)}
        />
      )}

      {/* Filters */}
      <UserFilters
        onFiltersChange={handleFiltersChange}
        users={users}
      />

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Lista de Usuarios
            {filteredUsers.length > 0 && (
              <span className="ml-2 text-sm text-gray-500">
                ({filteredUsers.length} de {users.length} usuarios)
              </span>
            )}
          </h3>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <UsersTable
            users={filteredUsers}
            onEdit={handleEdit}
            onToggle={handleUserToggle}
            onDelete={handleUserDelete}
          />
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <Modal
          isOpen={true}
          onClose={handleFormClose}
          title={editingUser ? 'Editar Usuario' : 'Invitar Nuevo Usuario'}
          size="lg"
        >
          <UserForm
            user={editingUser}
            onSave={handleUserSave}
            onCancel={handleFormClose}
          />
        </Modal>
      )}
    </div>
  );
}