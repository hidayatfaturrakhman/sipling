'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function KategoriPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '📌',
  });
  const supabase = createClient();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true });
    setCategories(data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingCategory) {
      // Update
      await supabase
        .from('categories')
        .update({
          name: formData.name,
          description: formData.description,
          icon: formData.icon,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingCategory.id);
    } else {
      // Create
      await supabase.from('categories').insert({
        name: formData.name,
        description: formData.description,
        icon: formData.icon,
      });
    }

    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '', icon: '📌' });
    fetchCategories();
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '📌',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus kategori ini?')) return;
    await supabase.from('categories').delete().eq('id', id);
    fetchCategories();
  };

  const handleToggleActive = async (category: Category) => {
    await supabase
      .from('categories')
      .update({ is_active: !category.is_active, updated_at: new Date().toISOString() })
      .eq('id', category.id);
    fetchCategories();
  };

  const openAddModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', icon: '📌' });
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Memuat...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Kelola Kategori</h2>
        <button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
        >
          <span>+</span> Tambah
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.map((category) => (
          <div
            key={category.id}
            className={`bg-white rounded-xl shadow-sm p-4 border-2 ${
              category.is_active ? 'border-transparent' : 'border-gray-200 opacity-60'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{category.icon}</span>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-800 text-sm truncate">{category.name}</h3>
                <p className="text-xs text-gray-500 truncate">{category.description || '-'}</p>
              </div>
            </div>

            <div className="flex gap-1">
              <button
                onClick={() => handleEdit(category)}
                className="flex-1 text-blue-600 hover:bg-blue-50 py-1.5 px-2 rounded text-xs border border-blue-200"
              >
                Edit
              </button>
              <button
                onClick={() => handleToggleActive(category)}
                className={`flex-1 py-1.5 px-2 rounded text-xs border ${
                  category.is_active
                    ? 'text-orange-600 border-orange-200 hover:bg-orange-50'
                    : 'text-green-600 border-green-200 hover:bg-green-50'
                }`}
              >
                {category.is_active ? 'Nonaktif' : 'Aktifkan'}
              </button>
              <button
                onClick={() => handleDelete(category.id)}
                className="flex-1 text-red-600 hover:bg-red-50 py-1.5 px-2 rounded text-xs border border-red-200"
              >
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Belum ada kategori. Tambahkan kategori baru!
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold mb-4">
              {editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Kategori
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Contoh: Jalan Rusak"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icon
                </label>
                <div className="flex gap-2 flex-wrap">
                  {['🛣️', '🗑️', '🕳️', '📌', '🚧', '💡', '🌳', '🏗️'].map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`w-10 h-10 text-2xl rounded-lg border-2 ${
                        formData.icon === icon
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deskripsi
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Deskripsi kategori..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingCategory(null);
                  }}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingCategory ? 'Simpan' : 'Tambah'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}