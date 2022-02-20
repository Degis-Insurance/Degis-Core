import smtplib, datetime
from email.mime.text import MIMEText
from email.utils import formataddr
from email.mime.multipart import MIMEMultipart

def mail_notification(subject, content) -> bool:
    '''
    mail notification to certain receivers
    :param subject: subject of the email
    :param content: content of the email
    :return: whether the email is sent out successfully
    '''
    # subject, content = 'Test', 'This is a test email'
    my_sender = 'degis_develop@163.com' # here we need one email address
    my_pass = 'IOQRAUSTHYUMOGQZ' # the password of the email address
    # my_users = ['andy@degis.io', 'oliveryanghaowei@gmail.com'] # who to receive the email
    my_users = ['15121193286@163.com', 'ylikp@connect.ust.hk']

    sent = True
    try:
        # construct the email object
        m = MIMEMultipart()
        msg = MIMEText(content,'plain','utf-8')
        m.attach(msg)
        m['From'] = formataddr(('auto-deploy', my_sender))
        m['Subject'] = subject
        server = smtplib.SMTP_SSL("smtp.163.com", 994)
        server.login(my_sender, my_pass)

        for my_user in my_users:
            m['To'] = formataddr(("auto deploy result", my_user))
            server.sendmail(my_sender, [my_user, ], m.as_string())
        server.quit()
    except Exception:
        sent = False

    if sent:
        print("The email is sent out successfully")
    else:
        print("The email fail to send")
    return sent

if __name__ == '__main__':
    mail_notification('Test', 'This is a test message')