import sys
from types import ModuleType

# ----------------------------------------------------
# 1. Create Mock Modules for sendiRPA
# ----------------------------------------------------

# Mock Logger
class MockLogger:
    def info(self, msg, exc_info=False):
        print(f"[LOG INFO]: {msg}")
    def error(self, msg, exc_info=True):
        print(f"[LOG ERROR]: {msg}")

# Create mock module tree
sendiRPA_mock = ModuleType("sendiRPA")
sendiRPA_mock.logHandler = ModuleType("sendiRPA.logHandler")
sendiRPA_mock.logHandler.logger = MockLogger()
sendiRPA_mock.logHandler.systemError = MockLogger()

sendiRPA_mock.globalVars = ModuleType("sendiRPA.globalVars")
sendiRPA_mock.globalVars.global_v = {}

# Mock API functions
class MockBrowser:
    def getCookies(self, _browser, delayBefore=0, delayAfter=0, continue_On_Failure=False):
        # Simulate returning only the SESSION cookie (single-cookie scenario)
        return "SESSION=Y2QwNDAzNWUtMjhjZi00OTZmLTk5MzItYThlZjg0MWMxMDg2"
    
    def mouseOver(self, _browser, xpath, delayBefore=0, delayAfter=0, continue_On_Failure=False, excepiton_err_msg='', _timeout=10):
        return True
        
    def click(self, _browser, xpath, delayBefore=0, delayAfter=0, _timeout=10, continue_On_Failure=False, excepiton_err_msg=''):
        return True
        
    def element_is_displayed(self, _browser, xpath, _timeout=10, delayBefore=0, delayAfter=0, continue_On_Failure=True, excepiton_err_msg=''):
        return True
        
    def getElementText(self, _browser, xpath, delayBefore=0, delayAfter=0, continue_On_Failure=False, excepiton_err_msg='', _timeout=10):
        # We need this to return user account or organization name depending on xpath
        if "用户账号" in xpath:
            return "test_rpa_user"
        elif "组织机构" in xpath:
            return "广州市政务服务数据管理局"
        return "mock_value"

class MockTimeFunction:
    def getNowTime(self, timeFormat):
        return "2026-07-02 16:54:11"

def mock_createXpath(xpath, iframe):
    return f"xpath={xpath};iframe={iframe}"

sendiRPA_mock.Browser = MockBrowser()
sendiRPA_mock.TimeFunction = MockTimeFunction()
sendiRPA_mock.createXpath = mock_createXpath

# Register mocks in sys.modules so the imported/defined script can read them
sys.modules["sendiRPA"] = sendiRPA_mock
sys.modules["sendiRPA.logHandler"] = sendiRPA_mock.logHandler
sys.modules["sendiRPA.globalVars"] = sendiRPA_mock.globalVars

# ----------------------------------------------------
# 2. Translated subflow '获取对应省信息.py' run code
# ----------------------------------------------------
import sendiRPA  # Import mock sendiRPA globally
from sendiRPA.logHandler import logger, systemError
from sendiRPA.globalVars import global_v as glv

glv['conn'] = ''

def run(hWeb=""):
    try:
        # 给两次机会，以防网页崩溃
        for _index in range(0, 2, 1):
            try:
                ####################
                # #获取省系统cookie值
                ####################
                cookies字符串=sendiRPA.Browser.getCookies(_browser=hWeb, delayBefore=0, delayAfter=0, continue_On_Failure=False)
                logger.info(cookies字符串,exc_info=False)
                #        字符串数组=sendiRPA.String.split(srcStr=cookies字符串, splitChar=';')
                #        logger.info(字符串数组,exc_info=False)
                #        logger.info(字符串数组[0],exc_info=False)
                #        logger.info(字符串[0],exc_info=False)
                #        第一对参数 = 字符串数组[0]
                #        第二对参数 = ''
                #        字符串数组=sendiRPA.String.split(srcStr=第一对参数, splitChar='=')
                openstack_cookie_insert = ''
                #        字符串数组=sendiRPA.String.split(srcStr=第二对参数, splitChar='=')
                SESSION = next((item.split('=', 1)[1].strip() for item in cookies字符串.split(';') if item.strip().startswith('SESSION=')), '')
                #        更新时间=sendiRPA.TimeFunction.getNowTime(timeFormat='%Y-%m-%d')
                更新时间=sendiRPA.TimeFunction.getNowTime(timeFormat='%Y-%m-%d %H:%M:%S')
                扫码次数 = 0
                # 失效时间置为空
                失效时间 = ''
                ####################
                # #获取用户对应省账号
                ####################
                suc=sendiRPA.Browser.mouseOver(_browser=hWeb, xpath=sendiRPA.createXpath(xpath="//span[@class='username']",iframe=[]), delayBefore=0, delayAfter=0, continue_On_Failure=False, excepiton_err_msg='鼠标不能放到账号信息上', _timeout=10)
                suc=sendiRPA.Browser.click(_browser=hWeb, xpath=sendiRPA.createXpath(xpath="//a[text()='账号设置 ']",iframe=[]), delayBefore=0, delayAfter=0, _timeout=10, continue_On_Failure=False, excepiton_err_msg='点击"账号设置"失败')
                #        time.sleep(2)
                用户账号是否出现 = False
                while (用户账号是否出现 is False):
                    # 检测用户账号是否出现
                    用户账号是否出现=sendiRPA.Browser.element_is_displayed(_browser=hWeb, xpath=sendiRPA.createXpath(xpath="//label[text()='用户账号']",iframe=[]), _timeout=10, delayBefore=0, delayAfter=0, continue_On_Failure=True, excepiton_err_msg='')
                    logger.info(用户账号是否出现,exc_info=False)
                # 获取用户在省系统的用户账号
                省账号=sendiRPA.Browser.getElementText(_browser=hWeb, xpath=sendiRPA.createXpath(xpath="//label[text()='用户账号']/../div/p",iframe=[]), delayBefore=0, delayAfter=0, continue_On_Failure=False, excepiton_err_msg='获取不到用户对应省账号', _timeout=10)
                while (省账号 == ''):
                    # 获取用户在省系统的用户账号
                    省账号=sendiRPA.Browser.getElementText(_browser=hWeb, xpath=sendiRPA.createXpath(xpath="//label[text()='用户账号']/../div/p",iframe=[]), delayBefore=0, delayAfter=0, continue_On_Failure=False, excepiton_err_msg='获取不到用户对应省账号', _timeout=10)
                logger.info("省账号:%s"%省账号,exc_info=False)
                # 获取用户在省系统的组织机构
                组织机构=sendiRPA.Browser.getElementText(_browser=hWeb, xpath=sendiRPA.createXpath(xpath="//label[text()='组织机构']/../div/p",iframe=[]), delayBefore=0, delayAfter=0, continue_On_Failure=True, excepiton_err_msg='获取不到用户对应组织机构', _timeout=10)
                while (组织机构 == ''):
                    # 获取用户在省系统的组织机构
                    组织机构=sendiRPA.Browser.getElementText(_browser=hWeb, xpath=sendiRPA.createXpath(xpath="//label[text()='组织机构']/../div/p",iframe=[]), delayBefore=0, delayAfter=0, continue_On_Failure=True, excepiton_err_msg='获取不到用户对应组织机构', _timeout=10)
                logger.info("组织机构:%s"%组织机构,exc_info=False)
                break
            except Exception as error:
                logger.info("流程出错：{}".format(str(error)),exc_info=False)
                logger.info('再给一次机会',exc_info=False)
        return SESSION, openstack_cookie_insert, 更新时间, 扫码次数, 省账号, 失效时间, 组织机构
    except Exception as e:
        systemError.error(e, exc_info=True)
        sys.exit(1)

# ----------------------------------------------------
# 3. Test Execution
# ----------------------------------------------------
if __name__ == "__main__":
    print("=== Start Local Mock Test for subflow ===")
    results = run(hWeb="dummy_browser_object")
    
    print("\n=== Test Results ===")
    headers = ["SESSION", "openstack_cookie_insert", "更新时间", "扫码次数", "省账号", "失效时间", "组织机构"]
    for header, val in zip(headers, results):
        print(f"{header:25}: {repr(val)}")
    
    # Assertions
    assert results[0] == "Y2QwNDAzNWUtMjhjZi00OTZmLTk5MzItYThlZjg0MWMxMDg2", "SESSION mismatch!"
    assert results[1] == "", "openstack_cookie_insert should be empty!"
    assert results[4] == "test_rpa_user", "省账号 mismatch!"
    assert results[6] == "广州市政务服务数据管理局", "组织机构 mismatch!"
    
    print("\n[SUCCESS] Local mock test passed without throwing list index out of range!")
