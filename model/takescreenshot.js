import fs from 'fs';
import path from 'path';
import Puppeteer from '../../../renderers/puppeteer/lib/puppeteer.js';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const ROOT_PATH = process.cwd();
const DB_PATH = path.join(ROOT_PATH, 'temp/iloli/screenshot-manager.db');

// 全局变量
let browser = null;
let isBrowserCreating = false;
let renderCount = 0;
let lastUsedTime = Date.now();
let dbInstance = null;
let maxRenderCount = 100;
let maxIdleTime = 3600000; // 1小时
let idleTimer = null;

// 读取配置
let configs = { screen_shot_quality: 1 };

// 初始化数据库
async function initDB() {
    if (!dbInstance) {
        try {
            // 确保目录存在
            const dbDir = path.dirname(DB_PATH);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }
            
            dbInstance = await open({
                filename: DB_PATH,
                driver: sqlite3.Database
            });
            
            await dbInstance.exec(`
                CREATE TABLE IF NOT EXISTS screenshot_cache (
                    target TEXT,
                    config TEXT,
                    image_path TEXT,
                    created_at INTEGER,
                    PRIMARY KEY (target, config)
                );
                
                CREATE TABLE IF NOT EXISTS render_stats (
                    date TEXT,
                    total_renders INTEGER DEFAULT 0,
                    PRIMARY KEY (date)
                );
                
                CREATE TABLE IF NOT EXISTS error_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date TEXT,
                    time TEXT,
                    error TEXT,
                    stack TEXT,
                    target TEXT
                );
            `);
            
            return dbInstance;
        } catch (err) {
            logger.error('初始化数据库失败:', err);
            // 返回一个空对象，模拟数据库操作
            return {
                run: async () => ({ changes: 0 }),
                get: async () => null,
                all: async () => [],
                exec: async () => {},
                close: async () => {}
            };
        }
    }
    
    return dbInstance;
}

// 获取浏览器实例
async function getBrowser() {
    lastUsedTime = Date.now();
    
    // 如果已有浏览器且可用，直接返回
    if (browser) {
        try {
            // 简单测试浏览器是否可用
            const page = await browser.newPage();
            await page.close();
            return browser;
        } catch (e) {
            logger.warn('现有浏览器实例不可用，将创建新实例');
            browser = null;
        }
    }
    
    // 避免并发创建
    if (isBrowserCreating) {
        logger.info('另一个进程正在创建浏览器实例，等待...');
        let waitTime = 0;
        while (isBrowserCreating && waitTime < 30000) {
            await new Promise(resolve => setTimeout(resolve, 500));
            waitTime += 500;
            
            if (browser) {
                return browser;
            }
        }
    }
    
    isBrowserCreating = true;
    
    try {
        logger.info('正在创建新的浏览器实例...');
        
        const puppeteerOptions = {
            headless: 'new',
            args: [
                '--disable-gpu',
                '--no-sandbox', 
                '--disable-dev-shm-usage',
                '--disable-setuid-sandbox',
                '--no-zygote',
                '--disable-web-security',
                '--allow-file-access-from-files',
                '--disable-features=site-per-process',
                '--disable-infobars',
                '--disable-notifications',
                '--window-size=1920,1080'
            ],
            puppeteerTimeout: 60000
        };
        
        const puppeteerInstance = new Puppeteer(puppeteerOptions);
        browser = await puppeteerInstance.browserInit();
        
        if (!browser) {
            throw new Error('浏览器实例创建失败');
        }
        
        renderCount = 0;
        
        if (!idleTimer) {
            idleTimer = setInterval(checkIdle, 5 * 60 * 1000); // 每5分钟检查一次
        }
        
        logger.info('浏览器实例创建成功');
        return browser;
    } catch (error) {
        logger.error('创建浏览器实例失败:', error);
        throw new Error(`获取浏览器实例失败: ${error.message}`);
    } finally {
        isBrowserCreating = false;
    }
}

// 检查浏览器空闲状态
function checkIdle() {
    const now = Date.now();
    if (now - lastUsedTime > maxIdleTime && browser) {
        logger.info('浏览器实例长时间未使用，释放资源');
    }
}

// 重置浏览器
async function resetBrowser() {
    try {
        logger.info('重置浏览器实例');
        
        if (browser) {
            // 保存旧实例引用
            const oldBrowser = browser;
            browser = null;
            
            // 创建新实例
            const puppeteerInstance = new Puppeteer({
                headless: 'new',
                args: [
                    '--disable-gpu',
                    '--no-sandbox', 
                    '--disable-dev-shm-usage',
                    '--disable-setuid-sandbox',
                    '--no-zygote',
                    '--disable-web-security',
                    '--allow-file-access-from-files',
                    '--disable-features=site-per-process',
                    '--disable-infobars',
                    '--disable-notifications',
                    '--window-size=1920,1080'
                ],
                puppeteerTimeout: 60000
            });
            
            browser = await puppeteerInstance.browserInit();
            
            if (!browser) {
                throw new Error('浏览器重置失败');
            }
            
            // 延迟关闭旧实例，避免影响正在进行的操作
            setTimeout(async () => {
                try {
                    await puppeteerInstance.stop(oldBrowser);
                    logger.info('旧浏览器实例已关闭');
                } catch (err) {
                    logger.error('关闭旧浏览器实例失败:', err);
                }
            }, 5000);
            
            renderCount = 0;
            lastUsedTime = Date.now();
            
            logger.info('浏览器实例重置完成');
        }
    } catch (error) {
        logger.error('重置浏览器失败:', error);
    }
}

// 检查缓存
async function checkCache(target, imageName, config, outputBasePath) {
    try {
        const db = await initDB();
        const configStr = JSON.stringify(config);
        
        const cachedImage = await db.get(
            `SELECT image_path FROM screenshot_cache 
             WHERE target = ? AND config = ?`,
            target, configStr
        );
        
        if (cachedImage && fs.existsSync(cachedImage.image_path)) {
            const imagePath = path.join(outputBasePath, `${imageName}.${config.type}`);
            fs.copyFileSync(cachedImage.image_path, imagePath);
            
            logger.info(`使用缓存的截图: ${imagePath}`);
            return imagePath;
        }
    } catch (error) {
        logger.debug('检查缓存失败:', error);
    }
    
    return null;
}

// 更新缓存
async function updateCache(target, config, imagePath) {
    try {
        const db = await initDB();
        const configStr = JSON.stringify(config);
        const now = Date.now();
        
        await db.run(
            `INSERT OR REPLACE INTO screenshot_cache 
             (target, config, image_path, created_at)
             VALUES (?, ?, ?, ?)`,
            target, configStr, imagePath, now
        );
        
        // 删除旧缓存条目
        const cacheExpiry = now - (config.cacheTime * 1000);
        await db.run(
            'DELETE FROM screenshot_cache WHERE created_at < ?',
            cacheExpiry
        );
    } catch (error) {
        logger.debug('更新缓存失败:', error);
    }
}

// 准备截图选项
async function prepareScreenshotOptions(page, config) {
    const screenshotOptions = {
        type: config.type,
        quality: config.type === 'jpeg' ? config.quality : undefined,
        fullPage: config.fullPage,
        omitBackground: config.omitBackground,
        encoding: config.encoding === 'base64' ? 'base64' : 'binary'
    };
    
    if (config.fullPage) {
        return screenshotOptions;
    }
    
    // 如果已经有明确的裁剪区域，直接使用
    if (config.clip && typeof config.clip === 'object') {
        screenshotOptions.clip = config.clip;
        return screenshotOptions;
    }
    
    // 获取内容尺寸
    let contentDimensions;
    try {
        contentDimensions = await page.evaluate(() => {
            return {
                width: Math.max(
                    document.body.scrollWidth,
                    document.documentElement.scrollWidth,
                    document.body.offsetWidth,
                    document.documentElement.offsetWidth,
                    document.body.clientWidth,
                    document.documentElement.clientWidth
                ),
                height: Math.max(
                    document.body.scrollHeight,
                    document.documentElement.scrollHeight,
                    document.body.offsetHeight,
                    document.documentElement.offsetHeight,
                    document.body.clientHeight,
                    document.documentElement.clientHeight
                )
            };
        });
    } catch (err) {
        logger.debug('获取内容尺寸失败:', err);
        contentDimensions = { width: 800, height: 600 };
    }
    
    let { width, height } = contentDimensions;
    let x = 0;
    let y = 0;
    
    // 应用裁剪比例
    const actualLeftCut = Math.floor(width * config.leftCutRatio);
    const actualRightCut = Math.floor(width * config.rightCutRatio);
    x += actualLeftCut;
    width -= actualLeftCut + actualRightCut;
    
    const actualTopCut = Math.floor(height * config.topCutRatio);
    const actualBottomCut = Math.floor(height * config.bottomCutRatio);
    y += actualTopCut;
    height -= actualTopCut + actualBottomCut;
    
    // 确保尺寸不会为负
    width = Math.max(width, 1);
    height = Math.max(height, 1);
    
    screenshotOptions.clip = { x, y, width, height };
    
    // 如果指定了选择器，截取选择器对应元素
    if (config.selector) {
        try {
            const elementHandle = await page.$(config.selector);
            if (elementHandle) {
                const box = await elementHandle.boundingBox();
                if (box) {
                    const clipX = Math.max(x, box.x);
                    const clipY = Math.max(y, box.y);
                    const clipWidth = Math.min(width, box.width);
                    const clipHeight = Math.min(height, box.height);
                    
                    if (clipWidth > 0 && clipHeight > 0) {
                        screenshotOptions.clip = {
                            x: clipX,
                            y: clipY,
                            width: clipWidth,
                            height: clipHeight
                        };
                    }
                }
            }
        } catch (error) {
            logger.warn(`处理选择器时出错: ${error.message}`);
        }
    }
    
    return screenshotOptions;
}

// 核心截图函数
/**
 * 获取截图
 * @param {string} target - 目标URL或文件路径
 * @param {string} imageName - 输出图片名称
 * @param {object} config - 截图配置
 * @returns {Promise<string>} 图片路径
 */
export async function takeScreenshot(target, imageName, config = {}) {
    const outputBasePath = path.join(process.cwd(), 'plugins/iloli-plugin/resources/temp');
    
    // 确保输出目录存在
    if (!fs.existsSync(outputBasePath)) {
        try {
            fs.mkdirSync(outputBasePath, { recursive: true });
        } catch (err) {
            logger.error('创建输出目录失败:', err);
        }
    }
    
    // 默认配置
    const defaultConfig = {
        width: null,                  // 截图宽度
        height: null,                 // 截图高度
        quality: 100,                 // JPEG图片质量(1-100)
        type: 'jpeg',                 // 图片类型(jpeg, png)
        deviceScaleFactor: configs.screen_shot_quality || 1, // 设备缩放比例
        selector: null,               // 截取特定元素的CSS选择器
        waitForSelector: null,        // 等待特定元素出现的CSS选择器
        waitForTimeout: null,         // 等待固定时间(毫秒)
        waitUntil: 'networkidle2',    // 页面加载完成条件
        fullPage: false,              // 是否截取整个页面
        topCutRatio: 0,               // 顶部裁剪比例
        bottomCutRatio: 0,            // 底部裁剪比例
        leftCutRatio: 0,              // 左侧裁剪比例
        rightCutRatio: 0,             // 右侧裁剪比例
        cacheTime: 3600,              // 缓存时间(秒)
        emulateDevice: null,          // 模拟设备
        userAgent: null,              // 自定义UA
        timeout: 120000,              // 总超时时间
        scrollToBottom: true,         // 是否滚动到底部
        cookies: null,                // 自定义Cookie
        allowFailure: true,           // 允许失败并返回默认图片
        authentication: null,         // HTTP认证
        clip: null,                   // 裁剪区域
        omitBackground: false,        // 是否省略背景
        encoding: 'binary',           // 图片编码
        hideScrollbars: true,         // 隐藏滚动条
        javascript: true,             // 是否启用JavaScript
        dark: false,                  // 暗黑模式
        retryCount: 2,                // 重试次数
        retryDelay: 1000              // 重试间隔
    };
    
    const finalConfig = { ...defaultConfig, ...config };
    
    // 尝试从缓存获取
    if (finalConfig.cacheTime > 0) {
        try {
            const cachedPath = await checkCache(target, imageName, finalConfig, outputBasePath);
            if (cachedPath) {
                return cachedPath;
            }
        } catch (err) {
            logger.debug('检查缓存失败:', err);
        }
    }
    
    let page = null;
    
    // 添加重试逻辑
    for (let retryAttempt = 0; retryAttempt <= finalConfig.retryCount; retryAttempt++) {
        try {
            // 设置截图超时
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`截图超时: ${finalConfig.timeout}ms`)), finalConfig.timeout);
            });
            
            // 获取浏览器实例
            const browser = await getBrowser();
            
            // 创建新页面
            page = await browser.newPage();
            
            // 配置认证
            if (finalConfig.authentication) {
                await page.authenticate(finalConfig.authentication);
            }
            
            // 设置Cookies
            if (finalConfig.cookies) {
                await page.setCookie(...finalConfig.cookies);
            }
            
            // 设置UserAgent
            if (finalConfig.userAgent) {
                await page.setUserAgent(finalConfig.userAgent);
            }
            
            // 设置设备模拟
            if (finalConfig.emulateDevice) {
                try {
                    const puppeteer = await import('puppeteer');
                    const devices = puppeteer.devices;
                    const device = devices[finalConfig.emulateDevice];
                    if (device) {
                        await page.emulate(device);
                    } else {
                        logger.warn(`未知设备: ${finalConfig.emulateDevice}`);
                    }
                } catch (err) {
                    logger.debug('模拟设备失败:', err);
                    // 使用默认视口
                    await page.setViewport({
                        width: finalConfig.width || 800,
                        height: finalConfig.height || 600,
                        deviceScaleFactor: finalConfig.deviceScaleFactor,
                        isMobile: finalConfig.isMobile || false,
                        hasTouch: finalConfig.hasTouch || false,
                        isLandscape: finalConfig.isLandscape || false
                    });
                }
            } else {
                // 设置视口
                await page.setViewport({
                    width: finalConfig.width || 800,
                    height: finalConfig.height || 600,
                    deviceScaleFactor: finalConfig.deviceScaleFactor,
                    isMobile: finalConfig.isMobile || false,
                    hasTouch: finalConfig.hasTouch || false,
                    isLandscape: finalConfig.isLandscape || false
                });
            }
            
            // 设置JavaScript
            await page.setJavaScriptEnabled(finalConfig.javascript);
            
            // 设置暗色模式
            if (finalConfig.dark) {
                await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
            }
            
            // 访问目标页面
            const isUrl = target.startsWith('http') || target.startsWith('https');
            try {
                await Promise.race([
                    page.goto(isUrl ? target : `file://${target}`, {
                        waitUntil: finalConfig.waitUntil,
                        timeout: finalConfig.timeout - 5000
                    }),
                    timeoutPromise
                ]);
            } catch (err) {
                logger.error('页面加载失败:', err);
                throw err;
            }
            
            // 等待选择器
            if (finalConfig.waitForSelector) {
                try {
                    await page.waitForSelector(finalConfig.waitForSelector, { 
                        timeout: 30000 
                    });
                } catch (err) {
                    logger.warn(`等待选择器失败: ${finalConfig.waitForSelector}`, err);
                }
            }
            
            // 等待固定时间
            if (finalConfig.waitForTimeout) {
                await page.waitForTimeout(finalConfig.waitForTimeout);
            }
            
            // 滚动到底部
            if (finalConfig.scrollToBottom) {
                try {
                    await page.evaluate(async () => {
                        await new Promise((resolve) => {
                            let totalHeight = 0;
                            const distance = 100;
                            const timer = setInterval(() => {
                                window.scrollBy(0, distance);
                                totalHeight += distance;
                                if (totalHeight >= document.body.scrollHeight) {
                                    clearInterval(timer);
                                    window.scrollTo(0, 0);
                                    resolve();
                                }
                            }, 100);
                        });
                    });
                } catch (err) {
                    logger.warn('滚动到底部失败:', err);
                }
            }
            
            // 隐藏滚动条
            if (finalConfig.hideScrollbars) {
                try {
                    await page.evaluate(() => {
                        document.documentElement.style.overflow = 'hidden';
                        document.body.style.overflow = 'hidden';
                    });
                } catch (err) {
                    logger.warn('隐藏滚动条失败:', err);
                }
            }
            
            // 获取内容尺寸
            const contentDimensions = await page.evaluate(() => {
                return {
                    width: Math.max(
                        document.body.scrollWidth,
                        document.documentElement.scrollWidth,
                        document.body.offsetWidth,
                        document.documentElement.offsetWidth,
                        document.body.clientWidth,
                        document.documentElement.clientWidth
                    ),
                    height: Math.max(
                        document.body.scrollHeight,
                        document.documentElement.scrollHeight,
                        document.body.offsetHeight,
                        document.documentElement.offsetHeight,
                        document.body.clientHeight,
                        document.documentElement.clientHeight
                    )
                };
            }).catch(err => {
                logger.debug('获取内容尺寸失败:', err);
                return { width: 800, height: 600 };
            });
            
            // 更新配置中的尺寸
            if (!config.width) {
                finalConfig.width = contentDimensions.width;
            }
            if (!config.height) {
                finalConfig.height = contentDimensions.height;
            }
            
            // 重设视口
            if (!finalConfig.fullPage) {
                await page.setViewport({
                    width: finalConfig.width,
                    height: finalConfig.height,
                    deviceScaleFactor: finalConfig.deviceScaleFactor
                });
            }
            
            // 准备截图选项
            const screenshotOptions = await prepareScreenshotOptions(page, finalConfig);
            
            // 执行截图
            const imageBuffer = await page.screenshot(screenshotOptions);
            
            // 确保输出目录存在
            const outputDir = path.dirname(path.join(outputBasePath, `${imageName}.${finalConfig.type}`));
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            const imagePath = path.join(outputBasePath, `${imageName}.${finalConfig.type}`);
            
            // 写入文件
            if (typeof imageBuffer === 'string') {
                fs.writeFileSync(imagePath, imageBuffer, 'base64');
            } else {
                fs.writeFileSync(imagePath, imageBuffer);
            }
            
            // 更新缓存
            if (finalConfig.cacheTime > 0) {
                await updateCache(target, finalConfig, imagePath);
            }
            
            // 增加渲染计数
            renderCount++;
            lastUsedTime = Date.now();
            
            // 如果达到最大渲染次数，安排重置
            if (renderCount >= maxRenderCount) {
                logger.info(`渲染次数已达到阈值(${renderCount}/${maxRenderCount})，准备重置浏览器...`);
                setTimeout(() => resetBrowser(), 1000);
            }
            
            return imagePath;
        } catch (error) {
            logger.error(`截图失败 (尝试 ${retryAttempt+1}/${finalConfig.retryCount+1}):`, error);
            
            // 记录错误
            try {
                const db = await initDB();
                const today = new Date().toISOString().split('T')[0];
                const now = new Date().toISOString();
                
                await db.run(
                    `INSERT INTO error_logs (date, time, error, stack, target)
                     VALUES (?, ?, ?, ?, ?)`,
                    today, now, error.message, error.stack, target
                );
            } catch (err) {
                logger.debug('记录错误失败:', err);
            }
            
            // 如果不是最后一次尝试，则重试
            if (retryAttempt < finalConfig.retryCount) {
                logger.info(`将在 ${finalConfig.retryDelay}ms 后重试...`);
                
                // 关闭之前的页面
                if (page) {
                    try {
                        await page.close();
                    } catch (err) {
                        logger.debug('关闭页面失败:', err);
                    }
                    page = null;
                }
                
                // 如果浏览器实例有问题，重置它
                if (error.message.includes('浏览器') || error.message.includes('Protocol')) {
                    try {
                        await resetBrowser();
                    } catch (err) {
                        logger.debug('重置浏览器失败:', err);
                    }
                }
                
                await new Promise(resolve => setTimeout(resolve, finalConfig.retryDelay));
                continue;
            }
            
            // 使用默认图片
            if (finalConfig.allowFailure && finalConfig.defaultImage) {
                return useDefaultImage(imageName, finalConfig, outputBasePath);
            }
            
            throw error;
        } finally {
            // 关闭页面
            if (page) {
                try {
                    await page.close();
                } catch (closeError) {
                    logger.debug('关闭页面失败:', closeError);
                }
            }
        }
    }
    
    // 如果所有尝试都失败，返回默认图片
    return useDefaultImage(imageName, finalConfig, outputBasePath);
}