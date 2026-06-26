import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserType } from './users/user.entity';
import { Product } from './products/product.entity';
import { Category } from './categories/category.entity';
import { Review } from './reviews/review.entity';
import { slugify } from './utils/slugify';

async function seed() {
    const app = await NestFactory.createApplicationContext(AppModule);

    const usersRepo = app.get<Repository<User>>(getRepositoryToken(User));
    const productsRepo = app.get<Repository<Product>>(getRepositoryToken(Product));
    const categoriesRepo = app.get<Repository<Category>>(getRepositoryToken(Category));
    const reviewsRepo = app.get<Repository<Review>>(getRepositoryToken(Review));

    await reviewsRepo.query(
        'TRUNCATE TABLE reviews, products, categories, users RESTART IDENTITY CASCADE',
    );

    const password = await bcrypt.hash('11345678', 10);

    // Super admin
    const superAdmin = usersRepo.create({
        username: 'Fouad Mohamed',
        email: 'fouad2000@example.com',
        password,
        userType: UserType.SUPER_ADMIN,
        isAccountVerified: true,
    });
    await usersRepo.save(superAdmin);

    // 5 admins
    const admins: User[] = [];
    for (let i = 1; i <= 5; i++) {
        const admin = usersRepo.create({
            username: `2admin${i}`,
            email: `2admin${i}@example.com`,
            password,
            userType: UserType.ADMIN,
            isAccountVerified: true,
        });
        admins.push(await usersRepo.save(admin));
    }

    // Categories (created by super admin)
    const categoryNames = ['Electronics', 'Accessories', 'Audio', 'Storage', 'Lighting'];
    const categories: Category[] = [];
    for (const name of categoryNames) {
        const category = categoriesRepo.create({ name, createdBy: { id: superAdmin.id } });
        categories.push(await categoriesRepo.save(category));
    }

    // 20 products with categories (4 per admin)
    const productData = [
        { title: 'Wireless Headphones',    price: 79.99,  description: 'High quality sound',            category: categories[2] },
        { title: 'Mechanical Keyboard',    price: 129.99, description: 'RGB backlit keyboard',          category: categories[1] },
        { title: 'USB-C Hub',              price: 39.99,  description: '7-in-1 USB hub',               category: categories[1] },
        { title: 'Laptop Stand',           price: 49.99,  description: 'Adjustable aluminum stand',    category: categories[1] },
        { title: 'Webcam HD',              price: 69.99,  description: '1080p webcam',                 category: categories[0] },
        { title: 'Monitor Light',          price: 35.99,  description: 'Eye-care screen bar',          category: categories[4] },
        { title: 'Mouse Pad XL',           price: 19.99,  description: 'Extended gaming mouse pad',    category: categories[1] },
        { title: 'Portable SSD',           price: 89.99,  description: '500GB fast storage',           category: categories[3] },
        { title: 'Smart Watch',            price: 199.99, description: 'Fitness and notifications',    category: categories[0] },
        { title: 'Phone Stand',            price: 14.99,  description: 'Foldable desk stand',          category: categories[1] },
        { title: 'LED Desk Lamp',          price: 44.99,  description: 'Dimmable USB lamp',            category: categories[4] },
        { title: 'Cable Organizer',        price: 12.99,  description: 'Keeps cables tidy',            category: categories[1] },
        { title: 'Ergonomic Mouse',        price: 59.99,  description: 'Vertical design mouse',        category: categories[1] },
        { title: 'Mini Projector',         price: 149.99, description: 'Portable HD projector',        category: categories[0] },
        { title: 'Power Bank',             price: 34.99,  description: '20000mAh fast charge',         category: categories[0] },
        { title: 'Bluetooth Speaker',      price: 54.99,  description: 'Waterproof portable speaker',  category: categories[2] },
        { title: 'Screen Protector',       price: 9.99,   description: 'Anti-glare film',              category: categories[1] },
        { title: 'Desk Organizer',         price: 24.99,  description: 'Multi-slot tray',              category: categories[1] },
        { title: 'Travel Adapter',         price: 27.99,  description: 'Universal plug adapter',       category: categories[0] },
        { title: 'Noise Cancelling Buds',  price: 99.99,  description: 'Active noise cancellation',    category: categories[2] },
    ];

    for (let i = 0; i < productData.length; i++) {
        const { category, ...rest } = productData[i];
        const owner = admins[i % admins.length];
        await productsRepo.save(
            productsRepo.create({
                ...rest,
                slug: slugify(rest.title),
                createdBy: { id: owner.id },
                category,
            }),
        );
    }

    // Reviews — 3 per product from random admins
    const comments = [
        'Great product!', 'Very useful', 'Good value for money', 'Highly recommend',
        'Works as expected', 'Solid build quality', 'Fast delivery', 'Would buy again',
        'Exceeded expectations', 'Could be better', null,
    ];

    const savedProducts = await productsRepo.find();
    for (const product of savedProducts) {
        for (let r = 0; r < 3; r++) {
            const reviewer = admins[r % admins.length];
            const review = reviewsRepo.create({
                rating: Math.floor(Math.random() * 3) + 3, // 3-5
                comment: comments[(r + savedProducts.indexOf(product)) % comments.length],
                product: { id: product.id },
                user: { id: reviewer.id },
            });
            await reviewsRepo.save(review);
        }
    }

    console.log('Seeded: 1 super admin, 5 admins, 5 categories, 20 products, 60 reviews');
    console.log('Password for all accounts: 12345678');
    await app.close();
}

seed().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
