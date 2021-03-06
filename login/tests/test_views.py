import logging

from django.conf import settings
from django.urls import reverse
from django.utils.translation import activate

from login.tests.setup_data import TestSetup

logger = logging.getLogger(__name__)


class TestModels(TestSetup):

    def test(self):

        # Do all users have a userprofile?
        self.assertIsNotNone(self.u1.userprofile)
        self.assertIsNotNone(self.u2.userprofile)
        self.assertIsNotNone(self.u3.userprofile)
        self.assertIsNotNone(self.u4.userprofile)
        self.assertIsNotNone(self.u5.userprofile)
        self.assertIsNotNone(self.u6.userprofile)
        self.assertIsNotNone(self.u7.userprofile)
        self.assertIsNotNone(self.u8.userprofile)

        # Do all groups have a groupprofile?
        self.assertIsNotNone(self.g1.groupprofile)
        self.assertIsNotNone(self.g2.groupprofile)
        self.assertIsNotNone(self.g3.groupprofile)
        self.assertIsNotNone(self.g4.groupprofile)
        self.assertIsNotNone(self.g5.groupprofile)
        self.assertIsNotNone(self.g6.groupprofile)


class TestViews(TestSetup):

    def test(self):

        # login as admin
        login = self.client.login(username=settings.MQTT['USERNAME'],
                                  password=settings.MQTT['PASSWORD'])
        self.assertTrue(login)

        # # retrieve any ambulance
        # response = self.client.get('/en/api/ambulance/{}/'.format(str(self.a1.id)),
        #                            follow=True)
        # self.assertEqual(response.status_code, 200)
        # result = JSONParser().parse(BytesIO(response.content))
        # answer = AmbulanceSerializer(Ambulance.objects.get(id=self.a1.id)).data
        # self.assertDictEqual(result, answer)

        # user detail
        activate('en')
        response = self.client.get(reverse('login:detail-user',
                                           kwargs={'pk': self.u1.id}),
                                   follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertTrue('admin@user.com' in response.content.decode())

        # # user create
        # response = self.client.post(reverse('login:create-user'),
        #                             {'username': 'newuser',
        #                              'password1': 'aasd67asd',
        #                              'password2': 'aasd67asd',
        #                              'userprofile-TOTAL_FORMS': 1,
        #                              'userprofile-INITIAL_FORMS': 0,
        #                              'userprofile-MIN_NUM_FORMS': 1,
        #                              'userprofile-MAX_NUM_FORMS': 1,
        #                              'userprofile-0-is_dispatcher': True},
        #                             follow=True)
        # self.assertEqual(response.status_code, 200)
        # logger.debug(response.content.decode())
        # self.assertEqual(User.objects.last().username, "newuser")

        # logout
        self.client.logout()
