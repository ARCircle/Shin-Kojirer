# Page snapshot

```yaml
- generic [active] [ref=e1]:
    - generic [ref=e2]:
        - heading "商品管理" [level=1] [ref=e3]
        - generic [ref=e4]: NetworkError when attempting to fetch resource.
        - generic [ref=e5]:
            - heading "新規商品を追加" [level=2] [ref=e6]
            - generic [ref=e8]:
                - generic [ref=e9]:
                    - generic [ref=e10]: 商品名
                    - textbox [ref=e11]: テスト商品
                - generic [ref=e12]:
                    - generic [ref=e13]: 価格
                    - spinbutton [ref=e14]: '500'
                - generic [ref=e15]:
                    - generic [ref=e16]: タイプ
                    - combobox [ref=e17]:
                        - option "メイン商品" [selected]
                        - option "トッピング"
                        - option "割引"
                - button "追加" [ref=e19]
        - generic [ref=e21]:
            - heading "メイン商品" [level=2] [ref=e22]
            - table [ref=e24]:
                - rowgroup [ref=e25]:
                    - row "商品名 価格 利用可能 操作" [ref=e26]:
                        - cell "商品名" [ref=e27]
                        - cell "価格" [ref=e28]
                        - cell "利用可能" [ref=e29]
                        - cell "操作" [ref=e30]
                - rowgroup
    - button "Open Next.js Dev Tools" [ref=e36] [cursor=pointer]:
        - img [ref=e37] [cursor=pointer]
    - alert [ref=e41]
```
