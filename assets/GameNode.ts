import { _decorator, Component, Node, resources, Vec3, tween, UITransform, JsonAsset, Prefab, instantiate, error, Quat } from 'cc';
const { ccclass, property } = _decorator;

// 定义数据接口
interface BottleData {
    id: number;
    position: { row: number; col: number };
    blocks: number[];
    lockStatus: number; // 0: unlocked, 1: free unlock, 2: ad unlock
}

interface LevelData {
    level: number;
    bottles: BottleData[];
}

@ccclass('GameNode')
export class GameNode extends Component {

    @property(Node)
    private gameLayoutTop: Node = null!;

    @property(Node)
    private gameLayoutBottom: Node = null!;

    @property(Prefab)
    private cubePrefab: Prefab = null!;

    private currentLevel: number = 1;
    private levelData: LevelData | null = null;
    private bottles: Node[] = [];
    private selectedBottle: Node | null = null;
    private bottleMap: Map<Node, BottleData> = new Map();
    // 用于存储当前选中瓶子的顶部相同元素
    private selectedTopBlocks: Node[] = [];
    // 用于记录动画状态，防止重复点击
    private isAnimating: boolean = false;

    start() {
        this.loadLevel(this.currentLevel);
    }

    update(deltaTime: number) {
        // 游戏更新逻辑
    }

    /**
     * 加载指定关卡
     * @param level 关卡编号
     */
    loadLevel(level: number) {
        // 加载关卡数据
        resources.load('json/gameData', JsonAsset, (err, asset: JsonAsset) => {
            if (err) {
                console.error("加载关卡数据失败:", err);
                return;
            }

            const gameData = asset.json;
            this.levelData = gameData.levels.find((l: LevelData) => l.level === level) || null;
            
            if (!this.levelData) {
                console.error(`关卡 ${level} 不存在`);
                return;
            }

            // 清空当前布局
            this.clearLayout();

            // 初始化瓶子
            this.initBottles();
        });
    }

    /**
     * 清空当前布局
     */
    clearLayout() {
        // 清空所有瓶子的数据映射
        this.bottleMap.clear();
        this.selectedBottle = null;
        this.selectedTopBlocks = [];
        this.isAnimating = false;
        
        // 获取所有瓶子节点
        const allBottles = [...this.gameLayoutTop.children, ...this.gameLayoutBottom.children];
        
        // 隐藏所有瓶子节点
        allBottles.forEach(bottle => {
            bottle.active = false;
            // 清空瓶子节点下的所有子节点
            bottle.removeAllChildren();
        });
    }

    /**
     * 初始化瓶子
     */
    initBottles() {
        if (!this.levelData) return;

        // 获取所有瓶子节点
        const topBottles = this.gameLayoutTop.children;
        const bottomBottles = this.gameLayoutBottom.children;
        const allBottleNodes = [...topBottles, ...bottomBottles];

        // 首先隐藏所有瓶子节点
        allBottleNodes.forEach(bottleNode => {
            bottleNode.active = false;
        });

        // 遍历关卡数据中的所有瓶子
        this.levelData.bottles.forEach((bottleData, index) => {
            // 根据位置信息找到对应的瓶子节点
            let bottleNode: Node | null = null;
            
            if (bottleData.position.row === 0 && bottleData.position.col < topBottles.length) {
                bottleNode = topBottles[bottleData.position.col];
            } else if (bottleData.position.row === 1 && bottleData.position.col < bottomBottles.length) {
                bottleNode = bottomBottles[bottleData.position.col];
            }

            if (!bottleNode) {
                console.warn(`未找到位置为 row:${bottleData.position.row}, col:${bottleData.position.col} 的瓶子节点`);
                return;
            }

            // 激活对应的瓶子节点
            bottleNode.active = true;

            // 保存瓶子引用和数据映射
            this.bottleMap.set(bottleNode, bottleData);

            // 初始化瓶子显示
            this.initBottle(bottleNode, bottleData);
        });
    }

    /**
     * 初始化瓶子显示
     * @param bottleNode 瓶子节点
     * @param bottleData 瓶子数据
     */
    initBottle(bottleNode: Node, bottleData: BottleData) {
        // 设置瓶子锁定状态
        this.setBottleLockStatus(bottleNode, bottleData.lockStatus);

        // 加载并显示方块
        this.loadAndDisplayBlocks(bottleNode, bottleData.blocks);

        // 添加点击事件
        bottleNode.on(Node.EventType.TOUCH_END, () => {
            this.onBottleClick(bottleNode, bottleData);
        }, this);
    }

    /**
     * 设置瓶子锁定状态
     * @param bottleNode 瓶子节点
     * @param lockStatus 锁定状态
     */
    setBottleLockStatus(bottleNode: Node, lockStatus: number) {
        // 根据锁定状态设置瓶子显示效果
        switch (lockStatus) {
            case 0: // 解锁
                // 可以添加解锁状态的视觉效果
                break;
            case 1: // 免费解锁
            case 2: // 广告解锁
                // 可以添加锁定状态的视觉效果，比如添加锁图标子节点
                break;
        }
    }

    /**
     * 加载并显示方块
     * @param bottleNode 瓶子节点
     * @param blocks 方块数据
     */
    loadAndDisplayBlocks(bottleNode: Node, blocks: number[]) {
        // 清空瓶子节点下的所有子节点（已有的cube实例）
        bottleNode.removeAllChildren();

        // 如果没有方块数据，直接返回
        if (blocks.length === 0) {
            return;
        }

        // 在瓶子节点下创建新的cube实例
        blocks.forEach((blockId, index) => {
            // 实例化cube预制体
            const cubeNode = instantiate(this.cubePrefab);
            bottleNode.addChild(cubeNode);
            
            // 调用cube脚本中的方法来设置图案和位置
            const cubeComponent = cubeNode.getComponent("Cube");
            if (cubeComponent) {
                // 设置图案
                (cubeComponent as any).setPattern(blockId);
                // 设置索引位置
                (cubeComponent as any).setIndex(index);
                // 播放出现动画
                (cubeComponent as any).playAppearAnimation?.();
            }
        });
    }

    /**
     * 获取瓶子顶部相同颜色的方块
     * @param bottleNode 瓶子节点
     * @returns 顶部相同颜色的方块数组
     */
    getTopSameColorBlocks(bottleNode: Node): Node[] {
        const bottleData = this.bottleMap.get(bottleNode);
        if (!bottleData || bottleData.blocks.length === 0) {
            return [];
        }

        // 获取顶部方块的颜色
        const topBlockColor = bottleData.blocks[bottleData.blocks.length - 1];
        
        // 从顶部开始查找相同颜色的方块
        const sameColorBlocks: Node[] = [];
        const children = bottleNode.children;
        
        // 从后往前遍历（从顶部开始）
        for (let i = children.length - 1; i >= 0; i--) {
            const cubeNode = children[i];
            const cubeComponent = cubeNode.getComponent("Cube");
            if (cubeComponent) {
                const patternId = (cubeComponent as any).getPattern();
                if (patternId === topBlockColor) {
                    sameColorBlocks.unshift(cubeNode); // 添加到数组开头保持顺序
                } else {
                    break; // 遇到不同颜色就停止
                }
            }
        }
        
        return sameColorBlocks;
    }

    /**
     * 移动方块动画
     * @param blocks 要移动的方块数组
     * @param offsetY Y轴偏移量
     * @param duration 动画持续时间
     * @param callback 动画完成回调
     */
    moveBlocksAnimation(blocks: Node[], offsetY: number, duration: number, callback?: () => void) {
        if (blocks.length === 0) {
            if (callback) callback();
            return;
        }

        let finishedCount = 0;
        const totalBlocks = blocks.length;
        
        blocks.forEach(block => {
            const originalPos = block.position.clone();
            const targetPos = new Vec3(originalPos.x, originalPos.y + offsetY, originalPos.z);
            
            tween(block)
                .to(duration, { position: targetPos })
                .call(() => {
                    finishedCount++;
                    if (finishedCount === totalBlocks && callback) {
                        callback();
                    }
                })
                .start();
        });
    }

    /**
     * 瓶子点击事件
     * @param bottleNode 点击的瓶子节点
     * @param bottleData 瓶子数据
     */
    onBottleClick(bottleNode: Node, bottleData: BottleData) {
        // 如果正在执行动画，不响应点击
        if (this.isAnimating) {
            return;
        }

        // 如果瓶子被锁定，不能操作
        if (bottleData.lockStatus !== 0) {
            // 如果是免费解锁的瓶子，可以解锁
            if (bottleData.lockStatus === 1) {
                this.unlockBottle(bottleNode, bottleData);
            }
            return;
        }

        // 如果没有选中瓶子，选中当前瓶子
        if (!this.selectedBottle) {
            this.selectedBottle = bottleNode;
            
            // 获取顶部相同颜色的方块
            this.selectedTopBlocks = this.getTopSameColorBlocks(bottleNode);
            
            // 执行向上移动动画作为提示
            this.moveBlocksAnimation(this.selectedTopBlocks, 50, 0.2, () => {
                // 动画完成后可以添加其他效果
            });
            
            return;
        }

        // 如果点击的是已选中的瓶子，取消选中并回到原位
        if (this.selectedBottle === bottleNode) {
            // 执行回到原位的动画
            this.moveBlocksAnimation(this.selectedTopBlocks, -50, 0.2, () => {
                // 动画完成后清理状态
                this.selectedBottle = null;
                this.selectedTopBlocks = [];
            });
            
            return;
        }

        // 点击的是不同的瓶子，执行倒水操作
        this.pourWater(this.selectedBottle, bottleNode);
    }

    /**
     * 解锁瓶子
     * @param bottleNode 瓶子节点
     * @param bottleData 瓶子数据
     */
    unlockBottle(bottleNode: Node, bottleData: BottleData) {
        // 如果是广告解锁，需要播放广告
        if (bottleData.lockStatus === 2) {
            // 播放广告逻辑
            // this.playAd(() => {
            //     bottleData.lockStatus = 0;
            //     this.setBottleLockStatus(bottleNode, 0);
            // });
            console.log("需要播放广告来解锁瓶子");
            return;
        }

        // 免费解锁
        bottleData.lockStatus = 0;
        this.setBottleLockStatus(bottleNode, 0);
    }

    /**
     * 倒水操作
     * @param fromBottle 源瓶子
     * @param toBottle 目标瓶子
     */
    pourWater(fromBottle: Node, toBottle: Node) {
        // 获取两个瓶子的数据
        const fromData = this.bottleMap.get(fromBottle);
        const toData = this.bottleMap.get(toBottle);

        if (!fromData || !toData) return;

        // 检查倒水条件
        const canPourResult = this.canPour(fromData, toData);
        
        // 如果不能倒水，回到原位置
        if (!canPourResult) {
            // 执行回到原位的动画
            this.moveBlocksAnimation(this.selectedTopBlocks, -50, 0.2, () => {
                // 动画完成后清理状态
                this.selectedBottle = null;
                this.selectedTopBlocks = [];
            });
            return;
        }

        // 设置动画状态，防止重复点击
        this.isAnimating = true;

        // 先让选中方块回到原位
        this.moveBlocksAnimation(this.selectedTopBlocks, -50, 0.2, () => {
            // 执行倒水动画
            this.executePourAnimation(fromBottle, toBottle, fromData, toData, () => {
                // 动画完成后执行实际的倒水逻辑
                const pourAmount = this.calculatePourAmount(fromData, toData);
                this.executePour(fromBottle, toBottle, fromData, toData, pourAmount);
                
                // 检查是否完成关卡
                this.checkLevelComplete();
                
                // 重置状态
                this.selectedBottle = null;
                this.selectedTopBlocks = [];
                this.isAnimating = false;
            });
        });
    }

    /**
     * 执行倒水动画
     * @param fromBottle 源瓶子节点
     * @param toBottle 目标瓶子节点
     * @param fromData 源瓶子数据
     * @param toData 目标瓶子数据
     * @param callback 动画完成回调
     */
    executePourAnimation(fromBottle: Node, toBottle: Node, fromData: BottleData, toData: BottleData, callback: () => void) {
        // 计算倒水数量
        const pourAmount = this.calculatePourAmount(fromData, toData);
        
        // 获取要移动的方块节点
        const movingBlocks = this.selectedTopBlocks.slice(-pourAmount);
        
        if (movingBlocks.length === 0) {
            if (callback) callback();
            return;
        }
        
        // 获取源瓶子和目标瓶子的世界坐标
        const fromWorldPos = fromBottle.worldPosition.clone();
        const toWorldPos = toBottle.worldPosition.clone();
        
        // 计算中间点坐标（X轴的一半距离）
        const midX = (fromWorldPos.x + toWorldPos.x) / 2;
        
        // 计算目标位置在目标瓶子中的局部坐标
        const targetIndex = toData.blocks.length;
        
        // 对每个方块执行抛物线动画
        let completedAnimations = 0;
        
        movingBlocks.forEach((block, index) => {
            // 获取方块的世界坐标
            const blockWorldPos = block.worldPosition.clone();
            
            // 计算方块在目标瓶子中的最终位置（局部坐标）
            const finalLocalPos = new Vec3(0, -196 + (targetIndex + index) * 148, 0);
            
            // 转换为世界坐标
            const toUITransform = toBottle.getComponent(UITransform);
            const finalWorldPos = toUITransform ? 
                                 toUITransform.convertToWorldSpaceAR(finalLocalPos) : 
                                 new Vec3(toWorldPos.x, toWorldPos.y + finalLocalPos.y, toWorldPos.z);
            
            // 记录初始旋转角度
            const initialRotation = block.eulerAngles.clone();
            
            // 创建抛物线路径的关键点
            const startPoint = blockWorldPos;
            const peakPoint = new Vec3(midX, blockWorldPos.y + 50, blockWorldPos.z);
            const endPoint = finalWorldPos;
            
            // 使用贝塞尔曲线实现更平滑的抛物线运动
            tween(block)
                .to(0.6, {}, {
                    onUpdate: (target, ratio) => {
                        // 计算贝塞尔曲线上的点
                        // 二次贝塞尔曲线公式: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
                        const t = ratio;
                        const invT = 1 - t;
                        
                        // 计算位置
                        const x = invT * invT * startPoint.x + 2 * invT * t * peakPoint.x + t * t * endPoint.x;
                        const y = invT * invT * startPoint.y + 2 * invT * t * peakPoint.y + t * t * endPoint.y;
                        const z = invT * invT * startPoint.z + 2 * invT * t * peakPoint.z + t * t * endPoint.z;
                        
                        block.setWorldPosition(new Vec3(x, y, z));
                        
                        // 添加旋转动画
                        const rotation = initialRotation.clone();
                        rotation.z += 720 * ratio; // 两圈旋转
                        block.setRotationFromEuler(rotation);
                    },
                    easing: 'smooth'
                })
                .call(() => {
                    // 动画结束后重置旋转
                    block.setRotationFromEuler(initialRotation);
                    completedAnimations++;
                    if (completedAnimations === movingBlocks.length) {
                        if (callback) callback();
                    }
                })
                .start();
        });
    }

    /**
     * 检查是否可以倒水
     * @param fromData 源瓶子数据
     * @param toData 目标瓶子数据
     * @returns 是否可以倒水
     */
    canPour(fromData: BottleData, toData: BottleData): boolean {
        // 检查目标瓶子是否已锁定
        if (toData.lockStatus !== 0) return false;

        // 检查源瓶子是否有水
        if (fromData.blocks.length === 0) return false;

        // 检查目标瓶子是否已满
        if (toData.blocks.length >= 4) return false;

        // 检查颜色是否匹配
        const fromTopBlock = fromData.blocks[fromData.blocks.length - 1];
        const toTopBlock = toData.blocks.length > 0 ? toData.blocks[toData.blocks.length - 1] : fromTopBlock;
        
        return fromTopBlock === toTopBlock;
    }

    /**
     * 计算倒水数量
     * @param fromData 源瓶子数据
     * @param toData 目标瓶子数据
     * @returns 倒水数量
     */
    calculatePourAmount(fromData: BottleData, toData: BottleData): number {
        const fromTopBlock = fromData.blocks[fromData.blocks.length - 1];
        
        // 计算源瓶子顶部同色方块数量
        let sameColorCount = 0;
        for (let i = fromData.blocks.length - 1; i >= 0; i--) {
            if (fromData.blocks[i] === fromTopBlock) {
                sameColorCount++;
            } else {
                break;
            }
        }

        // 计算目标瓶子可容纳空间
        const availableSpace = 4 - toData.blocks.length;

        // 返回实际可倒数量
        return Math.min(sameColorCount, availableSpace);
    }

    /**
     * 执行倒水
     * @param fromBottle 源瓶子节点
     * @param toBottle 目标瓶子节点
     * @param fromData 源瓶子数据
     * @param toData 目标瓶子数据
     * @param amount 倒水数量
     */
    executePour(fromBottle: Node, toBottle: Node, fromData: BottleData, toData: BottleData, amount: number) {
        // 更新数据
        for (let i = 0; i < amount; i++) {
            const block = fromData.blocks.pop();
            if (block !== undefined) {
                toData.blocks.push(block);
            }
        }

        // 更新显示
        this.loadAndDisplayBlocks(fromBottle, fromData.blocks);
        this.loadAndDisplayBlocks(toBottle, toData.blocks);
    }

    /**
     * 检查关卡是否完成
     */
    checkLevelComplete() {
        if (!this.levelData) return;

        // 检查是否所有瓶子都满足条件（空或只含同色方块）
        const isComplete = this.levelData.bottles.every(bottleData => {
            // 空瓶子满足条件
            if (bottleData.blocks.length === 0) return true;

            // 检查是否所有方块都是同一颜色
            const firstBlock = bottleData.blocks[0];
            return bottleData.blocks.every(block => block === firstBlock);
        });

        if (isComplete) {
            console.log("关卡完成！");
            // 可以在这里添加过关动画或跳转到下一关
            // this.nextLevel();
        }
    }

    /**
     * 下一关
     */
    nextLevel() {
        this.currentLevel++;
        this.loadLevel(this.currentLevel);
    }
}