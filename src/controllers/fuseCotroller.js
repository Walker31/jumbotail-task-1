import Fuse from 'fuse.js';

const fuseOptions = {
    keys: ['name', 'description', 'category'],
    threshold: 0.3, 
    includeScore: true,
}

function calculateScore(product, fuzzyScore, query) {
    let weightPrice = 0.2;
    let weightRating = 0.3;
    let weightPopularity = 0.3;

    const priceScore = 1-(product.price / 10000);
    const ratingScore = product.rating / 5;
    const stockBoost = product.stock > 0? 1.2 : 0.5;

}

