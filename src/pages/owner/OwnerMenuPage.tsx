import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/AppShell';
import { Spinner } from '@/lib/ui';
import { Plus, Trash2 } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
}

export default function OwnerMenuPage({ restaurantId }: { restaurantId?: string }) {
  const { profile } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [rId, setRId] = useState<string | null>(restaurantId || null);

  useEffect(() => {
    async function loadMenu() {
      let restaurantId = rId;
      
      // If no restaurantId provided, get it from owner's profile
      if (!restaurantId && profile) {
        const { data: restaurants } = await supabase
          .from('restaurants')
          .select('id')
          .eq('owner_id', profile.id)
          .single();
        
        restaurantId = restaurants?.id || null;
        setRId(restaurantId);
      }

      if (!restaurantId) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('category');

      setMenuItems((data as MenuItem[]) || []);
      setLoading(false);
    }

    loadMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  async function addMenuItem() {
    if (!rId || !name || !price) return;

    const { data } = await supabase
      .from('menu_items')
      .insert({
        restaurant_id: rId,
        name,
        description,
        price: parseFloat(price),
        category,
      })
      .select()
      .single();

    if (data) {
      setMenuItems([...menuItems, data as MenuItem]);
      setName('');
      setDescription('');
      setPrice('');
      setCategory('');
    }
  }

  async function deleteMenuItem(id: string) {
    await supabase.from('menu_items').delete().eq('id', id);
    setMenuItems(menuItems.filter(item => item.id !== id));
  }

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;

  return (
    <div className="animate-fade-in max-w-4xl">
      <PageHeader title="Menu Management" subtitle="Add and manage menu items for your restaurant" />

      <div className="card p-6 mb-6">
        <h3 className="mb-4 font-semibold">Add New Item</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <input
            className="input"
            placeholder="Item name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input"
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <input
            className="input"
            placeholder="Price"
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <textarea
            className="input"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <button onClick={addMenuItem} className="btn-primary mt-4 gap-2 w-full">
          <Plus className="h-4 w-4" /> Add Item
        </button>
      </div>

      <div className="card">
        <div className="border-b border-stone-200 px-6 py-4">
          <p className="font-semibold">Menu Items ({menuItems.length})</p>
        </div>
        <div className="space-y-2 p-6">
          {menuItems.length > 0 ? (
            menuItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 rounded-lg border border-stone-200 p-4">
                <div className="flex-1">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-stone-600">{item.description}</p>
                  <p className="mt-1 text-xs text-stone-400">{item.category}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-semibold">${item.price.toFixed(2)}</p>
                  <button
                    onClick={() => deleteMenuItem(item.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-stone-500">No menu items yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
