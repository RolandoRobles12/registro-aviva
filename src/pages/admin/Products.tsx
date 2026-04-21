import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../config/firebase';
import { LoadingSpinner, Alert, Button, Modal } from '../../components/ui';
import { Product } from '../../types';
import { ProductService } from '../../services/products';
import {
  PlusIcon,
  PencilIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  TagIcon
} from '@heroicons/react/24/outline';

export default function AdminProducts() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Real-time listener wrapped in onAuthStateChanged so Firestore is
  // never queried before the auth token is confirmed.
  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      unsubFirestore?.();
      unsubFirestore = null;

      if (!firebaseUser) {
        setAllProducts([]);
        setLoading(false);
        return;
      }

      unsubFirestore = onSnapshot(
        collection(db, 'products'),
        (snap) => {
          setAllProducts(
            snap.docs
              .map(d => ({ id: d.id, ...d.data() } as Product))
              .sort((a, b) => a.name.localeCompare(b.name, 'es'))
          );
          setLoading(false);
        },
        (err) => {
          setError(err.message || 'Error cargando productos');
          setLoading(false);
        }
      );
    });

    return () => {
      unsubAuth();
      unsubFirestore?.();
    };
  }, []);

  const openCreate = () => {
    setEditingProduct(null);
    setFormId('');
    setFormName('');
    setFormErrors({});
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setFormId(p.id);
    setFormName(p.name);
    setFormErrors({});
    setShowForm(true);
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!editingProduct) {
      if (!formId.trim()) errs.id = 'El identificador es requerido';
      else if (!/^[A-Za-z0-9_]+$/.test(formId.trim()))
        errs.id = 'Solo letras, números y guiones bajos';
    }
    if (!formName.trim()) errs.name = 'El nombre es requerido';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    try {
      setSaving(true);
      if (editingProduct) {
        await ProductService.updateProduct(editingProduct.id, formName);
        showMsg('success', `Producto "${formName}" actualizado`);
      } else {
        await ProductService.createProduct(formId.trim(), formName);
        showMsg('success', `Producto "${formName}" creado`);
      }
      setShowForm(false);
    } catch (e: any) {
      setError(e.message || 'Error guardando producto');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (p: Product) => {
    try {
      const next = p.status === 'active' ? 'inactive' : 'active';
      await ProductService.setProductStatus(p.id, next);
      showMsg('success', `Producto "${p.name}" ${next === 'active' ? 'activado' : 'desactivado'}`);
    } catch (e: any) {
      setError(e.message || 'Error actualizando estado');
    }
  };

  const handleSeed = async () => {
    try {
      setSeeding(true);
      const count = await ProductService.seedDefaultProducts();
      showMsg('success', `${count} productos predeterminados cargados`);
    } catch (e: any) {
      setError(e.message || 'Error cargando productos predeterminados');
    } finally {
      setSeeding(false);
    }
  };

  const showMsg = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') { setSuccess(msg); setTimeout(() => setSuccess(null), 3500); }
    else { setError(msg); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <TagIcon className="h-8 w-8 mr-3 text-indigo-500" />
              Gestión de Productos
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Administra los productos del sistema. Los productos activos estarán disponibles
              en kioscos, usuarios y filtros.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleSeed}
              disabled={seeding}
              leftIcon={<ArrowPathIcon className="h-4 w-4" />}
            >
              {seeding ? 'Cargando...' : 'Cargar predeterminados'}
            </Button>
            <Button
              variant="primary"
              onClick={openCreate}
              leftIcon={<PlusIcon className="h-4 w-4" />}
            >
              Nuevo Producto
            </Button>
          </div>
        </div>
      </div>

      {error && <Alert type="error" message={error} dismissible onDismiss={() => setError(null)} />}
      {success && <Alert type="success" message={success} dismissible onDismiss={() => setSuccess(null)} />}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        <p className="font-medium text-blue-800 mb-1">¿Cómo funciona?</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Cada producto tiene un <strong>identificador único</strong> (clave interna) y un <strong>nombre visible</strong>.</li>
          <li>El identificador no puede cambiarse después de crear el producto (ej: <code className="bg-blue-100 px-1 rounded">BA</code>, <code className="bg-blue-100 px-1 rounded">Aviva_Contigo</code>).</li>
          <li>Desactivar un producto lo oculta de los dropdowns pero no elimina datos históricos.</li>
          <li>Usa <strong>"Cargar predeterminados"</strong> si es la primera vez para inicializar la colección.</li>
        </ul>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Productos
            {allProducts.length > 0 && (
              <span className="ml-2 text-sm text-gray-500">
                ({allProducts.filter(p => p.status === 'active').length} activos
                {allProducts.some(p => p.status === 'inactive') &&
                  `, ${allProducts.filter(p => p.status === 'inactive').length} inactivos`})
              </span>
            )}
          </h3>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : allProducts.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <TagIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="font-medium">No hay productos configurados</p>
            <p className="text-sm mt-1">Crea un producto o usa "Cargar predeterminados" para empezar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Identificador
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allProducts.map(p => (
                  <tr key={p.id} className={p.status === 'inactive' ? 'opacity-50' : 'hover:bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                        {p.id}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {p.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {p.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircleIcon className="h-3.5 w-3.5" /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          <XCircleIcon className="h-3.5 w-3.5" /> Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(p)}
                          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium flex items-center gap-1"
                        >
                          <PencilIcon className="h-4 w-4" /> Editar
                        </button>
                        <button
                          onClick={() => handleToggleStatus(p)}
                          className={`text-sm font-medium flex items-center gap-1 ${
                            p.status === 'active'
                              ? 'text-red-500 hover:text-red-700'
                              : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {p.status === 'active' ? (
                            <><XCircleIcon className="h-4 w-4" /> Desactivar</>
                          ) : (
                            <><CheckCircleIcon className="h-4 w-4" /> Activar</>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showForm && (
        <Modal
          isOpen
          onClose={() => setShowForm(false)}
          title={editingProduct ? `Editar: ${editingProduct.name}` : 'Nuevo Producto'}
          size="sm"
        >
          <div className="space-y-4">
            {!editingProduct && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Identificador <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formId}
                  onChange={e => setFormId(e.target.value)}
                  placeholder="Ej: Nuevo_Producto"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {formErrors.id && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.id}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Clave interna única. Solo letras, números y guiones bajos. No se puede cambiar después.
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre visible <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Ej: Mi Nuevo Producto"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {formErrors.name && (
                <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
              <Button variant="secondary" onClick={() => setShowForm(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} loading={saving} disabled={saving}>
                {editingProduct ? 'Guardar cambios' : 'Crear producto'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
