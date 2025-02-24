const router = require('express').Router()
const db = require('./db')

router
  .route('/inventory')
  // TODO: Create a GET route that returns a list of everything in the inventory table
  .get(async (req, res) => {
    try {
      const [inventoryItems] = await db.query('SELECT * FROM inventory')
      res.json(inventoryItems)
    } catch (err) {
      res.status(500).send('Error retrieving inventory: ' + err.message)
    }
  })

  // TODO: Create a POST route that inserts inventory items
  .post(async (req, res) => {
    try {
      const {
        price,
        quantity,
        name,
        image,
        description
      } = req.body
      if (!(
        price &&
        quantity &&
        name &&
        image &&
        description
      ))
      return res
        .status(204)
        .send('must include price, quantity, name, image and description')
      
      res.status(204).send('New item created')
    } catch (err) {
      res.status(500).send('Error creating item: ' + err.message)
    }
  })
  // This route will accept price, quantity, name, image, and description as JSON
  // in the request body.
  // It should return a 204 status code

router
  .route('/inventory/:id')
  // TODO: Write a GET route that returns a single item from the inventory
  .get(async (req, res) => {
    try {
      const [inventoryItem] = await db.query('SELECT * FROM inventory WHERE id = ?', [req.params.id]) // that matches the id from the route parameter
      if (!inventoryItem || inventoryItem.length === 0) { // Should return 404 if no item is found
        res.status(404).send('Item not found' + err.message)
      }
      res.json(inventoryItem[0])
    } catch (err) {
      res.status(404).send('Error retrieving inventory: ' + err.message)
    }
  })
  // The response should look like:
  // {
  //   "id": 1,
  //   "name": "Stratocaster",
  //   "image": "strat.jpg",
  //   "description": "One of the most iconic electric guitars ever made.",
  //   "price": 599.99,
  //   "quantity": 3
  // }

  // TODO: Create a PUT route that updates the inventory table based on the id
  .put(async (req, res) => {
    try {
      const {
        price,
        quantity,
        name,
        image,
        description
      } = req.body
      if (!(
        price &&
        quantity &&
        name &&
        image &&
        description
      ))
      return res
        .status(400)
        .send('must include price, quantity, name, image and description')
      

      const [{affectedRows}] = await db.query(
        `UPDATE inventory SET ? WHERE id = ?`,
        [{price, quantity, name, image, description}, req.params.id]
      )
      if (affectedRows === 0) return res.status(404).send('Item not found')
      res.status(204).send('Item updated')
    } catch (err) {
      res.status(500).send('Error updating item: ' + err.message)
    }
  })
  // in the route parameter.
  // This route should accept price, quantity, name, description, and image
  // in the request body.
  // If no item is found, return a 404 status.
  // If an item is modified, return a 204 status code.


  .delete(async (req, res) => {
    try {
      const [{affectedRows}] = await db.query(
        `DELETE FROM inventory WHERE id = ?`,
        req.params.id
      )

      if (affectedRows === 0) return res.status(404).send('Ttem not found')
      resres.status(204).send('Item deleted')
    } catch (err) {
      res.status(500).send('Error deleting item: ' + err.message)
    }
  })
  // TODO: Create a DELETE route that deletes an item from the inventory table
  // based on the id in the route parameter.
  // If no item is found, return a 404 status.
  // If an item is deleted, return a 204 status code.

router
  .route('/cart')
  .get(async (req, res) => {
    const [cartItems] = await db.query(
      `SELECT
        cart.id,
        cart.inventory_id AS inventoryId,
        cart.quantity,
        inventory.price,
        inventory.name,
        inventory.image,
        inventory.quantity AS inventoryQuantity
      FROM cart INNER JOIN inventory ON cart.inventory_id=inventory.id`
    )
    const [[{total}]] = await db.query(
      `SELECT SUM(cart.quantity * inventory.price) AS total
       FROM cart, inventory WHERE cart.inventory_id=inventory.id`
    )
    res.json({cartItems, total: total || 0})
  })
  .post(async (req, res) => {
    const {inventoryId, quantity} = req.body
    // Using a LEFT JOIN ensures that we always return an existing
    // inventory item row regardless of whether that item is in the cart.
    const [[item]] = await db.query(
      `SELECT
        inventory.id,
        name,
        price,
        inventory.quantity AS inventoryQuantity,
        cart.id AS cartId
      FROM inventory
      LEFT JOIN cart on cart.inventory_id=inventory.id
      WHERE inventory.id=?;`,
      [inventoryId]
    )
    if (!item) return res.status(404).send('Item not found')
    const {cartId, inventoryQuantity} = item
    if (quantity > inventoryQuantity)
      return res.status(409).send('Not enough inventory')
    if (cartId) {
      await db.query(
        `UPDATE cart SET quantity=quantity+? WHERE inventory_id=?`,
        [quantity, inventoryId]
      )
    } else {
      await db.query(
        `INSERT INTO cart(inventory_id, quantity) VALUES (?,?)`,
        [inventoryId, quantity]
      )
    }
    res.status(204).end()
  })
  .delete(async (req, res) => {
    // Deletes the entire cart table
    await db.query('DELETE FROM cart')
    res.status(204).end()
  })

router
  .route('/cart/:cartId')
  .put(async (req, res) => {
    const {quantity} = req.body
    const [[cartItem]] = await db.query(
      `SELECT
        inventory.quantity as inventoryQuantity
        FROM cart
        INNER JOIN inventory on cart.inventory_id=inventory.id
        WHERE cart.id=?`,
        [req.params.cartId]
    )
    if (!cartItem)
      return res.status(404).send('Not found')
    const {inventoryQuantity} = cartItem
    if (quantity > inventoryQuantity)
      return res.status(409).send('Not enough inventory')
    if (quantity > 0) {
      await db.query(
        `UPDATE cart SET quantity=? WHERE id=?`
        ,[quantity, req.params.cartId]
      )
    } else {
      await db.query(
        `DELETE FROM cart WHERE id=?`,
        [req.params.cartId]
      )
    }
    res.status(204).end()
  })
  .delete(async (req, res) => {
    const [{affectedRows}] = await db.query(
      `DELETE FROM cart WHERE id=?`,
      [req.params.cartId]
    )
    if (affectedRows === 1)
      res.status(204).end()
    else
      res.status(404).send('Cart item not found')
  })

module.exports = router
