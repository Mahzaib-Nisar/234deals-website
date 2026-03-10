const sequelize = require('../config/database');

let DEALS_COLUMNS = null;
let HAS_CLICK_EVENTS = null;

async function introspect() {
  if (!DEALS_COLUMNS) {
    const [cols] = await sequelize.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema='public' AND table_name='deals'`
    );
    DEALS_COLUMNS = new Set(cols.map(c => c.column_name));
  }
  if (HAS_CLICK_EVENTS === null) {
    const [tables] = await sequelize.query(
      `SELECT to_regclass('public.click_events') AS exists`
    );
    HAS_CLICK_EVENTS = !!tables[0].exists;
  }
}

function has(col) {
  return DEALS_COLUMNS && DEALS_COLUMNS.has(col);
}

function parsePaging(req) {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildSort(sort, dir) {
  const direction = (dir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const allow = {
    created_at: '"createdAt"',
    price: 'price',
    title: 'title',
  };
  if (has('expiry_date')) {
    allow.expiry_date = 'expiry_date';
  }
  const key = allow[sort || 'created_at'] || '"createdAt"';
  return `${key} ${direction}`;
}

exports.list = async (req, res, next) => {
  try {
    await introspect();
    const { page, limit, offset } = parsePaging(req);

    const where = [];
    const params = [];

    if (req.query.q) {
      params.push(`%${req.query.q}%`, `%${req.query.q}%`);
      where.push('(title ILIKE $' + (params.length - 1) + ' OR description ILIKE $' + params.length + ')');
    }
    if (req.query.min_price) {
      params.push(Number(req.query.min_price));
      where.push('price >= $' + params.length);
    }
    if (req.query.max_price) {
      params.push(Number(req.query.max_price));
      where.push('price <= $' + params.length);
    }
    if (req.query.category_id && has('category_id')) {
      params.push(Number(req.query.category_id));
      where.push('category_id = $' + params.length);
    }
    if (req.query.store_id && has('store_id')) {
      params.push(Number(req.query.store_id));
      where.push('store_id = $' + params.length);
    }
    if (req.query.status && has('status')) {
      params.push(String(req.query.status));
      where.push('status = $' + params.length);
    }

    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const orderSql = 'ORDER BY ' + buildSort(req.query.sort, req.query.dir);

    const baseSelectCols = ['id', 'title', 'description', 'price', '"createdAt"'];
    if (has('image_url')) baseSelectCols.push('image_url');
    if (has('expiry_date')) baseSelectCols.push('expiry_date');
    if (has('store_id')) baseSelectCols.push('store_id');
    if (has('category_id')) baseSelectCols.push('category_id');
    if (has('status')) baseSelectCols.push('status');

    const countSql = `SELECT COUNT(*)::INT AS count FROM deals ${whereSql}`;
    const dataSql = `SELECT ${baseSelectCols.join(', ')}
                     FROM deals
                     ${whereSql}
                     ${orderSql}
                     LIMIT ${limit} OFFSET ${offset}`;

    const [[countRow]] = await sequelize.query(countSql, { bind: params });
    const [rows] = await sequelize.query(dataSql, { bind: params });

    return res.json({
      success: true,
      data: rows,
      meta: {
        page,
        limit,
        total: countRow.count,
        pages: Math.ceil(countRow.count / limit),
      },
    });
  } catch (err) {
    return next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    await introspect();
    const id = Number(req.params.id);
    const baseSelectCols = ['id', 'title', 'description', 'price', '"createdAt"'];
    if (has('image_url')) baseSelectCols.push('image_url');
    if (has('expiry_date')) baseSelectCols.push('expiry_date');
    if (has('store_id')) baseSelectCols.push('store_id');
    if (has('category_id')) baseSelectCols.push('category_id');
    if (has('status')) baseSelectCols.push('status');

    const sql = `SELECT ${baseSelectCols.join(', ')} FROM deals WHERE id = $1`;
    const [rows] = await sequelize.query(sql, { bind: [id] });
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    await introspect();
    const { title, description, price, store_id, category_id, image_url, expiry_date, status } = req.body;
    const cols = ['title', 'description', 'price'];
    const vals = ['$1', '$2', '$3'];
    const bind = [title, description || null, price];
    let idx = 3;
    if (has('store_id') && typeof store_id !== 'undefined') { idx += 1; cols.push('store_id'); vals.push(`$${idx}`); bind.push(store_id); }
    if (has('category_id') && typeof category_id !== 'undefined') { idx += 1; cols.push('category_id'); vals.push(`$${idx}`); bind.push(category_id); }
    if (has('image_url') && typeof image_url !== 'undefined') { idx += 1; cols.push('image_url'); vals.push(`$${idx}`); bind.push(image_url); }
    if (has('expiry_date') && typeof expiry_date !== 'undefined') { idx += 1; cols.push('expiry_date'); vals.push(`$${idx}`); bind.push(expiry_date); }
    if (has('status') && typeof status !== 'undefined') { idx += 1; cols.push('status'); vals.push(`$${idx}`); bind.push(status); }

    const sql = `INSERT INTO deals (${cols.join(', ')}) VALUES (${vals.join(', ')}) RETURNING id`;
    const [rows] = await sequelize.query(sql, { bind });
    return res.status(201).json({ success: true, data: { id: rows[0].id } });
  } catch (err) {
    return next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    await introspect();
    const id = Number(req.params.id);
    const allowed = ['title', 'description', 'price'];
    if (has('store_id')) allowed.push('store_id');
    if (has('category_id')) allowed.push('category_id');
    if (has('image_url')) allowed.push('image_url');
    if (has('expiry_date')) allowed.push('expiry_date');
    if (has('status')) allowed.push('status');
    const sets = [];
    const bind = [];
    let idx = 0;
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        idx += 1;
        sets.push(`${k} = $${idx}`);
        bind.push(req.body[k]);
      }
    }
    if (!sets.length) {
      return res.json({ success: true, message: 'No changes' });
    }
    bind.push(id);
    const sql = `UPDATE deals SET ${sets.join(', ')} WHERE id = $${bind.length} RETURNING id`;
    const [rows] = await sequelize.query(sql, { bind });
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }
    return res.json({ success: true, data: { id: rows[0].id } });
  } catch (err) {
    return next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const [result] = await sequelize.query(`DELETE FROM deals WHERE id = $1`, { bind: [id] });
    return res.json({ success: true, message: 'Deal deleted' });
  } catch (err) {
    return next(err);
  }
};

exports.trending = async (req, res, next) => {
  try {
    await introspect();
    if (HAS_CLICK_EVENTS) {
      const [rows] = await sequelize.query(
        `SELECT d.id, d.title, d.description, d.price, d."createdAt", COUNT(c.id)::INT AS clicks
         FROM deals d
         JOIN click_events c ON c.deal_id = d.id
         WHERE c.clicked_at > NOW() - INTERVAL '7 days'
         GROUP BY d.id
         ORDER BY clicks DESC
         LIMIT 20`
      );
      return res.json({ success: true, data: rows });
    }
    const [rows] = await sequelize.query(
      `SELECT id, title, description, price, "createdAt"
       FROM deals
       ORDER BY "createdAt" DESC
       LIMIT 20`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return next(err);
  }
};

exports.endingSoon = async (req, res, next) => {
  try {
    await introspect();
    if (has('expiry_date')) {
      const [rows] = await sequelize.query(
        `SELECT id, title, description, price, "createdAt", expiry_date
         FROM deals
         WHERE expiry_date IS NOT NULL AND expiry_date > NOW()
         ORDER BY expiry_date ASC
         LIMIT 20`
      );
      return res.json({ success: true, data: rows });
    }
    const [rows] = await sequelize.query(
      `SELECT id, title, description, price, "createdAt"
       FROM deals
       ORDER BY "createdAt" DESC
       LIMIT 20`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return next(err);
  }
};

exports.newest = async (req, res, next) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT id, title, description, price, "createdAt"
       FROM deals
       ORDER BY "createdAt" DESC
       LIMIT 20`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    return next(err);
  }
};
