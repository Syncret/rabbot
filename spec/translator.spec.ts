import { translatorKeywordRegex } from "../src/translator";

describe("Translator", function () {
  it("should be able to recognzie translate sentence", function () {
    // /^兔兔(图片?像?)?(中|英|日|韩)?(?:文|语)?(翻?译?到?)(中|英|日|韩)?(?:文|语)?\S*/
    
    expect(JSON.stringify(translatorKeywordRegex.exec("兔兔翻译"))).toEqual(
      '["兔兔翻译",null,null,"翻译",null]'
    );
    expect(JSON.stringify(translatorKeywordRegex.exec("兔兔中翻英"))).toEqual(
      '["兔兔中翻英",null,"中","翻","英"]'
    );
    expect(JSON.stringify(translatorKeywordRegex.exec("兔兔图片中翻英test"))).toEqual(
      '["兔兔图片中翻英test","图片","中","翻","英"]'
    );
    expect(JSON.stringify(translatorKeywordRegex.exec("兔兔图翻英语 test"))).toEqual(
      '["兔兔图翻英语","图",null,"翻","英"]'
    );
    expect(JSON.stringify(translatorKeywordRegex.exec("兔兔图片英语翻译一下 test"))).toEqual(
      '["兔兔图片英语翻译一下","图片","英","翻译",null]'
    );
    expect(JSON.stringify(translatorKeywordRegex.exec("兔兔不要"))).toEqual(
      '["兔兔不要",null,null,"",null]'
    );
    expect(JSON.stringify(translatorKeywordRegex.exec("兔兔图中"))).toEqual(
      '["兔兔图中","图","中","",null]'
    );
  });
});
