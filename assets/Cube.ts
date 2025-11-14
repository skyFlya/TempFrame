import { _decorator, Component, Sprite, SpriteFrame, resources, Color, tween, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

// 方块图案ID范围
const MIN_PATTERN_ID = 1;
const MAX_PATTERN_ID = 7;

// 方块在瓶子中的Y坐标位置（从底部开始）
const CUBE_Y_POSITIONS = [-196, -48, 100, 248];

@ccclass('Cube')
export class Cube extends Component {
    @property(Sprite)
    private sprite: Sprite | null = null;

    // 当前图案ID
    private _patternId: number = 0;

    // 方块在瓶子中的索引位置
    private _index: number = 0;

    // 是否被选中
    private _isSelected: boolean = false;

    start() {
        // 如果没有引用sprite组件，尝试获取
        if (!this.sprite) {
            this.sprite = this.getComponent(Sprite);
        }
    }

    /**
     * 设置方块图案
     * @param patternId 图案ID (1-7)
     */
    setPattern(patternId: number) {
        // 验证图案ID范围
        if (patternId < MIN_PATTERN_ID || patternId > MAX_PATTERN_ID) {
            console.warn(`图案ID ${patternId} 超出有效范围 [${MIN_PATTERN_ID}, ${MAX_PATTERN_ID}]`);
            return;
        }

        // 保存图案ID
        this._patternId = patternId;

        // 加载对应ID的图案资源
        resources.load<SpriteFrame>(`tuan/cube${patternId}/spriteFrame`, (err, spriteFrame) => {
            if (err) {
                console.error(`加载图案资源失败: cube${patternId}`, err);
                return;
            }

            // 设置精灵帧
            if (this.sprite) {
                this.sprite.spriteFrame = spriteFrame;
            }
        });
    }

    /**
     * 获取当前图案ID
     * @returns 图案ID
     */
    getPattern(): number {
        return this._patternId;
    }

    /**
     * 设置方块在瓶子中的索引位置
     * @param index 索引位置 (0-3)
     */
    setIndex(index: number) {
        if (index >= 0 && index < CUBE_Y_POSITIONS.length) {
            this._index = index;
            // 更新Y坐标位置
            const yPosition = CUBE_Y_POSITIONS[index];
            this.node.setPosition(new Vec3(0, yPosition, 0));
        }
    }

    /**
     * 获取方块在瓶子中的索引位置
     * @returns 索引位置
     */
    getIndex(): number {
        return this._index;
    }

    /**
     * 清除图案
     */
    clearPattern() {
        this._patternId = 0;
        if (this.sprite) {
            this.sprite.spriteFrame = null;
        }
    }

    /**
     * 重置方块状态
     */
    reset() {
        this.clearPattern();
        this._isSelected = false;
        this._index = 0;
        if (this.sprite) {
            this.sprite.color = Color.WHITE;
        }
    }

    /**
     * 设置选中状态
     * @param selected 是否选中
     */
    setSelected(selected: boolean) {
        this._isSelected = selected;
        
        if (this.sprite) {
            // 选中时给方块添加高亮效果
            this.sprite.color = selected ? new Color(200, 200, 255) : Color.WHITE;
        }
    }

    /**
     * 是否被选中
     * @returns 选中状态
     */
    isSelected(): boolean {
        return this._isSelected;
    }

    /**
     * 播放出现动画
     */
    playAppearAnimation() {
        // 缩放动画
        this.node.setScale(new Vec3(0.1, 0.1, 0.1));
        tween(this.node)
            .to(0.3, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    /**
     * 播放消失动画
     * @param callback 动画完成回调
     */
    playDisappearAnimation(callback?: () => void) {
        tween(this.node)
            .to(0.3, { scale: new Vec3(0.1, 0.1, 0.1) })
            .call(() => {
                if (callback) callback();
            })
            .start();
    }

    /**
     * 播放选中动画
     */
    playSelectAnimation() {
        tween(this.node)
            .to(0.1, { scale: new Vec3(1.2, 1.2, 1.2) })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    /**
     * 播放移动动画
     * @param targetPosition 目标位置
     * @param callback 动画完成回调
     */
    playMoveAnimation(targetPosition: Vec3, callback?: () => void) {
        tween(this.node)
            .to(0.3, { position: targetPosition })
            .call(() => {
                if (callback) callback();
            })
            .start();
    }
}