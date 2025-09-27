import { Hono } from 'hono';
import { MerchandiseService } from '../services/merchandiseService';
import { MerchandiseType } from '../models/types';

const app = new Hono();
const merchandiseService = new MerchandiseService();

// GET /merchandise - 商品一覧取得
app.get('/', async (c) => {
  try {
    const { available } = c.req.query();
    const options =
      available !== undefined ? { available: available === 'true' } : undefined;

    const merchandise = await merchandiseService.getAllMerchandise(options);
    return c.json(merchandise);
  } catch (error) {
    console.error('Error fetching merchandise:', error);
    return c.json({ error: 'Failed to fetch merchandise' }, 500);
  }
});

// POST /merchandise - 新規商品作成
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { name, price, type, isAvailable } = body;

    // バリデーション
    if (!name || typeof name !== 'string') {
      return c.json({ error: 'Name is required and must be a string' }, 400);
    }

    if (typeof price !== 'number') {
      return c.json({ error: 'Price is required and must be a number' }, 400);
    }

    if (
      !type ||
      !Object.values(MerchandiseType).includes(type as MerchandiseType)
    ) {
      return c.json(
        {
          error: `Type is required and must be one of: ${Object.values(MerchandiseType).join(', ')}`,
        },
        400
      );
    }

    const merchandise = await merchandiseService.createMerchandise({
      name,
      price,
      type: type as MerchandiseType,
      isAvailable,
    });

    return c.json(merchandise, 201);
  } catch (error) {
    console.error('Error creating merchandise:', error);
    return c.json({ error: 'Failed to create merchandise' }, 500);
  }
});

// GET /merchandise/:id - 商品詳細取得
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const merchandise = await merchandiseService.getMerchandiseById(id);

    if (!merchandise) {
      return c.json({ error: 'Merchandise not found' }, 404);
    }

    return c.json(merchandise);
  } catch (error) {
    console.error('Error fetching merchandise:', error);
    return c.json({ error: 'Failed to fetch merchandise' }, 500);
  }
});

// PUT /merchandise/:id - 商品更新
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const existing = await merchandiseService.getMerchandiseById(id);
    if (!existing) {
      return c.json({ error: 'Merchandise not found' }, 404);
    }

    const { name, price, type, isAvailable } = body;

    // バリデーション
    if (name !== undefined && typeof name !== 'string') {
      return c.json({ error: 'Name must be a string' }, 400);
    }

    if (price !== undefined && typeof price !== 'number') {
      return c.json({ error: 'Price must be a number' }, 400);
    }

    if (
      type !== undefined &&
      !Object.values(MerchandiseType).includes(type as MerchandiseType)
    ) {
      return c.json(
        {
          error: `Type must be one of: ${Object.values(MerchandiseType).join(', ')}`,
        },
        400
      );
    }

    if (isAvailable !== undefined && typeof isAvailable !== 'boolean') {
      return c.json({ error: 'isAvailable must be a boolean' }, 400);
    }

    const merchandise = await merchandiseService.updateMerchandise(id, {
      name,
      price,
      type: type as MerchandiseType,
      isAvailable,
    });

    return c.json(merchandise);
  } catch (error) {
    console.error('Error updating merchandise:', error);
    return c.json({ error: 'Failed to update merchandise' }, 500);
  }
});

// POST /merchandise/:id/prices - 商品価格設定
app.post('/:merchandiseId/prices', async (c) => {
  try {
    const merchandiseId = c.req.param('merchandiseId');
    const body = await c.req.json();
    const { price, since } = body;

    // バリデーション
    if (typeof price !== 'number') {
      return c.json({ error: 'Price is required and must be a number' }, 400);
    }

    if (!since || typeof since !== 'string') {
      return c.json(
        { error: 'Since is required and must be a date string' },
        400
      );
    }

    // 日付の妥当性チェック
    const sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) {
      return c.json({ error: 'Since must be a valid date string' }, 400);
    }

    const merchandise = await merchandiseService.setMerchandisePrice(
      merchandiseId,
      {
        price,
        since,
      }
    );

    return c.json(merchandise, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Merchandise not found') {
      return c.json({ error: 'Merchandise not found' }, 404);
    }
    console.error('Error setting merchandise price:', error);
    return c.json({ error: 'Failed to set merchandise price' }, 500);
  }
});

// DELETE /merchandise/:id - 商品削除
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');

    const existing = await merchandiseService.getMerchandiseById(id);
    if (!existing) {
      return c.json({ error: 'Merchandise not found' }, 404);
    }

    await merchandiseService.deleteMerchandise(id);
    return c.json({ message: 'Merchandise deleted successfully' });
  } catch (error) {
    console.error('Error deleting merchandise:', error);
    return c.json({ error: 'Failed to delete merchandise' }, 500);
  }
});

// POST /merchandise/:id/toggle-availability - 商品利用可能性切り替え
app.post('/:id/toggle-availability', async (c) => {
  try {
    const id = c.req.param('id');

    const merchandise = await merchandiseService.toggleAvailability(id);
    return c.json(merchandise);
  } catch (error) {
    if (error instanceof Error && error.message === 'Merchandise not found') {
      return c.json({ error: 'Merchandise not found' }, 404);
    }
    console.error('Error toggling merchandise availability:', error);
    return c.json({ error: 'Failed to toggle merchandise availability' }, 500);
  }
});

export { app as merchandiseAPI };
